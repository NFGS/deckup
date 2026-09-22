#!/usr/bin/env node
/**
 * Publishes the DeckUp documentation to Notion.
 *
 * Usage:
 *   NOTION_TOKEN=... NOTION_PAGE_ID=... node --experimental-strip-types scripts/notion-sync.ts
 *   NOTION_TOKEN=... NOTION_PAGE_ID=... node --experimental-strip-types scripts/notion-sync.ts --dry-run
 *
 * The root page ID is the "DeckUp" page inside the "Ningendo Bee Projects"
 * workspace page (see SPEC.md §7). Each document becomes a child page with the
 * markdown content converted to Notion blocks.
 */

import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const BLOCKS_PER_REQUEST = 100;

interface NotionBlock {
  object: 'block';
  type: string;
  [key: string]: unknown;
}

interface DocumentSpec {
  title: string;
  path: string;
}

const DOCUMENTS: DocumentSpec[] = [
  {
    title: 'DeckUp — User Story Refinement',
    path: 'docs/01-requirements/user-story-refinement.md',
  },
  { title: 'DeckUp — Traceability Matrix', path: 'docs/01-requirements/traceability-matrix.md' },
  { title: 'DeckUp — Glossary', path: 'docs/01-requirements/glossary.md' },
  { title: 'DeckUp — Architecture Overview', path: 'docs/02-architecture/overview.md' },
  { title: 'DeckUp — Data Model', path: 'docs/02-architecture/data-model.md' },
  { title: 'DeckUp — Test Plan', path: 'docs/03-testing/test-plan.md' },
  { title: 'DeckUp — Test Cases', path: 'docs/03-testing/test-cases.md' },
  { title: 'DeckUp — Deployment Guide', path: 'docs/04-operations/deployment.md' },
  { title: 'DeckUp — Runbook', path: 'docs/04-operations/runbook.md' },
  { title: 'DeckUp — Security Notes', path: 'docs/04-operations/security.md' },
];

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');

function textBlock(
  type: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3' | 'quote',
  text: string,
): NotionBlock {
  const content = text.slice(0, 1900);

  return {
    object: 'block',
    type,
    [type]: {
      rich_text: [{ type: 'text', text: { content } }],
    },
  };
}

function codeBlock(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [{ type: 'text', text: { content: text.slice(0, 1900) } }],
      language: 'plain text',
    },
  };
}

/**
 * Minimal markdown → Notion blocks conversion: headings, lists, quotes, code
 * fences and tables (kept verbatim inside code blocks). Anything else becomes
 * a paragraph.
 */
export function markdownToBlocks(markdown: string): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  const lines = markdown.split('\n');
  let inCodeFence = false;
  let buffer: string[] = [];

  const flushParagraph = (): void => {
    const text = buffer.join(' ').trim();

    if (text.length > 0) {
      blocks.push(textBlock('paragraph', text));
    }

    buffer = [];
  };

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      if (inCodeFence) {
        blocks.push(codeBlock(buffer.join('\n')));
        buffer = [];
        inCodeFence = false;
      } else {
        flushParagraph();
        inCodeFence = true;
      }
      continue;
    }

    if (inCodeFence) {
      buffer.push(line);
      continue;
    }

    if (line.startsWith('|')) {
      flushParagraph();
      blocks.push(codeBlock(line));
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);

    if (heading) {
      flushParagraph();
      const level = heading[1]?.length ?? 1;
      const text = heading[2] ?? '';
      blocks.push(
        textBlock(level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3', text),
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line.trimStart());

    if (bullet) {
      flushParagraph();
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: (bullet[1] ?? '').slice(0, 1900) } }],
        },
      });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line.trimStart());

    if (quote) {
      flushParagraph();
      blocks.push(textBlock('quote', quote[1] ?? ''));
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      continue;
    }

    buffer.push(line.trim());
  }

  flushParagraph();
  return blocks;
}

async function notionRequest(
  path: string,
  token: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Notion API ${path} failed with ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

/** Titles of the child pages already published under the parent page. */
async function listChildPages(token: string, parentPageId: string): Promise<Map<string, string>> {
  const pages = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const query = new URLSearchParams({ page_size: '100' });

    if (cursor) {
      query.set('start_cursor', cursor);
    }

    const response = await notionRequest(
      `/blocks/${parentPageId}/children?${query.toString()}`,
      token,
      { method: 'GET' },
    );
    const results = Array.isArray(response.results)
      ? (response.results as Array<Record<string, unknown>>)
      : [];

    for (const block of results) {
      const childPage = block.child_page as { title?: unknown } | undefined;
      const title = childPage?.title;

      if (block.type === 'child_page' && typeof title === 'string') {
        pages.set(title, String(block.id));
      }
    }

    cursor = typeof response.next_cursor === 'string' ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
}

async function archivePage(token: string, pageId: string): Promise<void> {
  await notionRequest(`/pages/${pageId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ archived: true }),
  });
}

async function publishDocument(
  token: string,
  parentPageId: string,
  document: DocumentSpec,
  existingPages: Map<string, string>,
): Promise<string> {
  const markdown = await readFile(resolve(REPOSITORY_ROOT, document.path), 'utf8');
  const blocks = markdownToBlocks(markdown);

  const previousPageId = existingPages.get(document.title);

  if (previousPageId) {
    await archivePage(token, previousPageId);
    console.log(`Archived previous "${document.title}" (${previousPageId})`);
  }

  const page = await notionRequest('/pages', token, {
    method: 'POST',
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: { title: [{ type: 'text', text: { content: document.title } }] },
      children: blocks.slice(0, BLOCKS_PER_REQUEST),
    }),
  });

  const pageId = String(page.id);

  for (let index = BLOCKS_PER_REQUEST; index < blocks.length; index += BLOCKS_PER_REQUEST) {
    await notionRequest(`/blocks/${pageId}/children`, token, {
      method: 'PATCH',
      body: JSON.stringify({ children: blocks.slice(index, index + BLOCKS_PER_REQUEST) }),
    });
  }

  return pageId;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PAGE_ID;

  if (dryRun) {
    for (const document of DOCUMENTS) {
      const markdown = await readFile(resolve(REPOSITORY_ROOT, document.path), 'utf8');
      const blocks = markdownToBlocks(markdown);
      console.log(`${document.title}: ${blocks.length} blocks (${basename(document.path)})`);
    }
    console.log('\nDry run finished — nothing was sent to Notion.');
    return;
  }

  if (!token || !parentPageId) {
    console.error('NOTION_TOKEN and NOTION_PAGE_ID are required (or use --dry-run).');
    process.exitCode = 1;
    return;
  }

  const existingPages = await listChildPages(token, parentPageId);

  for (const document of DOCUMENTS) {
    const pageId = await publishDocument(token, parentPageId, document, existingPages);
    console.log(`Published "${document.title}" → ${pageId}`);
  }
}

await main();
