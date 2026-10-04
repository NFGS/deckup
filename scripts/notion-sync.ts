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
 * markdown converted to rich Notion blocks: native tables, Mermaid diagrams,
 * GitHub-style callouts, to-dos, dividers, inline formatting and images.
 *
 * Relative images are uploaded to Cloudinary when CLOUDINARY_URL is set;
 * otherwise they degrade to a caption placeholder.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const BLOCKS_PER_REQUEST = 100;
const CLOUDINARY_FOLDER = 'deckup/docs';

interface NotionBlock {
  object: 'block';
  type: string;
  [key: string]: unknown;
}

interface RichTextItem {
  type: 'text';
  text: { content: string; link?: { url: string } | null };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
}

interface DocumentSpec {
  title: string;
  path: string;
  icon: string;
}

const DOCUMENTS: DocumentSpec[] = [
  {
    title: 'DeckUp — User Story Refinement',
    path: 'docs/01-requirements/user-story-refinement.md',
    icon: '📝',
  },
  {
    title: 'DeckUp — Traceability Matrix',
    path: 'docs/01-requirements/traceability-matrix.md',
    icon: '🔗',
  },
  { title: 'DeckUp — Glossary', path: 'docs/01-requirements/glossary.md', icon: '📖' },
  {
    title: 'DeckUp — Architecture Overview',
    path: 'docs/02-architecture/overview.md',
    icon: '🏛️',
  },
  { title: 'DeckUp — Data Model', path: 'docs/02-architecture/data-model.md', icon: '🗄️' },
  { title: 'DeckUp — Test Plan', path: 'docs/03-testing/test-plan.md', icon: '🧪' },
  { title: 'DeckUp — Test Cases', path: 'docs/03-testing/test-cases.md', icon: '✅' },
  { title: 'DeckUp — Deployment Guide', path: 'docs/04-operations/deployment.md', icon: '🚀' },
  { title: 'DeckUp — Platform Notes', path: 'docs/04-operations/platform-notes.md', icon: '🧭' },
  { title: 'DeckUp — Runbook', path: 'docs/04-operations/runbook.md', icon: '🛠️' },
  { title: 'DeckUp — Security Notes', path: 'docs/04-operations/security.md', icon: '🔒' },
  {
    title: 'DeckUp — Informe General del Sistema',
    path: 'docs/05-academic/informe-general-sistema.md',
    icon: '🎓',
  },
  { title: 'DeckUp — Project Status', path: 'docs/STATUS.md', icon: '📊' },
];

const CALLOUT_STYLES: Record<string, { emoji: string; color: string }> = {
  NOTE: { emoji: '📘', color: 'blue_background' },
  TIP: { emoji: '💡', color: 'green_background' },
  IMPORTANT: { emoji: '❗', color: 'purple_background' },
  WARNING: { emoji: '⚠️', color: 'yellow_background' },
  CAUTION: { emoji: '🚨', color: 'red_background' },
};

const NOTION_LANGUAGES = new Set([
  'abap',
  'abc',
  'agda',
  'arduino',
  'ascii art',
  'assembly',
  'bash',
  'basic',
  'bnf',
  'c',
  'c#',
  'c++',
  'clojure',
  'coffeescript',
  'coq',
  'css',
  'dart',
  'dhall',
  'diff',
  'docker',
  'ebnf',
  'elixir',
  'elm',
  'erlang',
  'f#',
  'flow',
  'fortran',
  'gherkin',
  'glsl',
  'go',
  'graphql',
  'groovy',
  'haskell',
  'hcl',
  'html',
  'idris',
  'java',
  'javascript',
  'json',
  'julia',
  'kotlin',
  'latex',
  'less',
  'lisp',
  'livescript',
  'llvm ir',
  'lua',
  'makefile',
  'markdown',
  'markup',
  'matlab',
  'mathematica',
  'mermaid',
  'nix',
  'notion formula',
  'objective-c',
  'ocaml',
  'pascal',
  'perl',
  'php',
  'plain text',
  'powershell',
  'prolog',
  'protobuf',
  'purescript',
  'python',
  'r',
  'racket',
  'reason',
  'ruby',
  'rust',
  'sass',
  'scala',
  'scheme',
  'scss',
  'shell',
  'smalltalk',
  'solidity',
  'sql',
  'swift',
  'toml',
  'typescript',
  'vb.net',
  'verilog',
  'vhdl',
  'visual basic',
  'webassembly',
  'xml',
  'yaml',
  'java/c/c++/c#',
]);

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  sh: 'bash',
  yml: 'yaml',
  prisma: 'plain text',
  puml: 'plain text',
  plantuml: 'plain text',
  text: 'plain text',
  console: 'plain text',
  env: 'plain text',
  ini: 'plain text',
  http: 'plain text',
  csv: 'plain text',
};

function normalizeLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();

  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }

  return NOTION_LANGUAGES.has(normalized) ? normalized : 'plain text';
}

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');

const INLINE_TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;

function plainText(content: string): RichTextItem {
  return { type: 'text', text: { content: content.slice(0, 1900) } };
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

/** Parses inline markdown (bold, italic, code, strikethrough, links) into rich text. */
export function parseInline(text: string): RichTextItem[] {
  const items: RichTextItem[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      items.push(plainText(text.slice(lastIndex, index)));
    }

    const token = match[0];

    if (token.startsWith('**')) {
      items.push({
        type: 'text',
        text: { content: token.slice(2, -2).slice(0, 1900) },
        annotations: { bold: true },
      });
    } else if (token.startsWith('~~')) {
      items.push({
        type: 'text',
        text: { content: token.slice(2, -2).slice(0, 1900) },
        annotations: { strikethrough: true },
      });
    } else if (token.startsWith('`')) {
      items.push({
        type: 'text',
        text: { content: token.slice(1, -1).slice(0, 1900) },
        annotations: { code: true },
      });
    } else if (token.startsWith('[')) {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      const label = link?.[1] ?? token;
      const url = link?.[2] ?? '';

      if (isExternalUrl(url)) {
        items.push({ type: 'text', text: { content: label.slice(0, 1900), link: { url } } });
      } else {
        items.push(plainText(label));
      }
    } else if (token.startsWith('*')) {
      items.push({
        type: 'text',
        text: { content: token.slice(1, -1).slice(0, 1900) },
        annotations: { italic: true },
      });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    items.push(plainText(text.slice(lastIndex)));
  }

  return items.length > 0 ? items : [plainText('')];
}

function richTextBlock(type: string, text: string): NotionBlock {
  return {
    object: 'block',
    type,
    [type]: { rich_text: parseInline(text) },
  };
}

function codeBlock(text: string, language: string): NotionBlock {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [plainText(text)],
      language: normalizeLanguage(language),
    },
  };
}

function calloutBlock(type: string, lines: string[]): NotionBlock {
  const style = CALLOUT_STYLES[type] ?? CALLOUT_STYLES.NOTE;
  const text = lines.join(' ').trim();

  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: parseInline(text),
      icon: { type: 'emoji', emoji: style?.emoji ?? '📘' },
      color: style?.color ?? 'blue_background',
    },
  };
}

function toDoBlock(text: string, checked: boolean): NotionBlock {
  return {
    object: 'block',
    type: 'to_do',
    to_do: { rich_text: parseInline(text), checked },
  };
}

function dividerBlock(): NotionBlock {
  return { object: 'block', type: 'divider', divider: {} };
}

function tableOfContentsBlock(): NotionBlock {
  return { object: 'block', type: 'table_of_contents', table_of_contents: { color: 'default' } };
}

function imageBlock(url: string, caption: string): NotionBlock {
  return {
    object: 'block',
    type: 'image',
    image: {
      type: 'external',
      external: { url },
      caption: caption ? parseInline(caption) : [],
    },
  };
}

function tableRow(cells: string[]): NotionBlock {
  return {
    object: 'block',
    type: 'table_row',
    table_row: { cells: cells.map((cell) => parseInline(cell)) },
  };
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function tableBlock(headerLine: string, bodyLines: string[]): NotionBlock {
  const header = parseTableRow(headerLine);
  const rows = bodyLines.map(parseTableRow);
  const width = header.length;

  const normalize = (cells: string[]): string[] => {
    if (cells.length === width) {
      return cells;
    }

    if (cells.length < width) {
      return [...cells, ...Array<string>(width - cells.length).fill('')];
    }

    return cells.slice(0, width);
  };

  return {
    object: 'block',
    type: 'table',
    table: {
      table_width: width,
      has_column_header: true,
      has_row_header: false,
      children: [tableRow(normalize(header)), ...rows.map((row) => tableRow(normalize(row)))],
    },
  };
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s:|-]+\|$/.test(line.trim());
}

function isDivider(line: string): boolean {
  return /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim());
}

const IMAGE_PATTERN = /^!\[([^\]]*)\]\(([^)]+)\)$/;

interface ImageResolver {
  (url: string, alt: string): Promise<NotionBlock>;
}

function createImageResolver(cloudinaryUrl: string | undefined, baseDir: string): ImageResolver {
  const cache = new Map<string, string>();

  return async (url: string, alt: string): Promise<NotionBlock> => {
    if (isExternalUrl(url)) {
      return imageBlock(url, alt);
    }

    if (!cloudinaryUrl) {
      return richTextBlock('paragraph', `[Figura: ${alt || url}]`);
    }

    const absolutePath = resolve(baseDir, url.replace(/^\.\//, ''));

    if (!cache.has(absolutePath)) {
      const uploaded = await uploadToCloudinary(absolutePath, cloudinaryUrl);
      cache.set(absolutePath, uploaded);
    }

    return imageBlock(cache.get(absolutePath) ?? '', alt);
  };
}

async function uploadToCloudinary(filePath: string, cloudinaryUrl: string): Promise<string> {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(cloudinaryUrl);

  if (!match) {
    throw new Error('CLOUDINARY_URL is malformed (expected cloudinary://key:secret@cloud)');
  }

  const [, apiKey, apiSecret, cloudName] = match;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash('sha1')
    .update(`folder=${CLOUDINARY_FOLDER}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');
  const file = await readFile(filePath);
  const form = new FormData();

  form.append('file', new Blob([file]), basename(filePath));
  form.append('api_key', apiKey ?? '');
  form.append('timestamp', String(timestamp));
  form.append('folder', CLOUDINARY_FOLDER);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed for ${filePath}: ${response.status}`);
  }

  const payload = (await response.json()) as { secure_url?: string };

  if (!payload.secure_url) {
    throw new Error(`Cloudinary upload returned no secure_url for ${filePath}`);
  }

  return payload.secure_url;
}

/**
 * Converts markdown into Notion blocks: headings, paragraphs, lists, to-dos,
 * quotes, callouts, dividers, code fences (Mermaid included), native tables and
 * images. Anything else becomes a paragraph.
 */
export async function markdownToBlocks(
  markdown: string,
  resolveImage: ImageResolver,
): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  const lines = markdown.split('\n');
  const firstContent = lines.findIndex((line) => line.trim().length > 0);

  // The Notion page title already renders the document H1; drop the duplicate.
  if (firstContent >= 0 && /^#\s+/.test(lines[firstContent] ?? '')) {
    lines.splice(firstContent, 1);
  }

  let inCodeFence = false;
  let codeLanguage = 'plain text';
  let buffer: string[] = [];

  const flushParagraph = (): void => {
    const text = buffer.join(' ').trim();

    if (text.length > 0) {
      blocks.push(richTextBlock('paragraph', text));
    }

    buffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';

    if (line.trimStart().startsWith('```')) {
      if (inCodeFence) {
        blocks.push(codeBlock(buffer.join('\n'), codeLanguage));
        buffer = [];
        inCodeFence = false;
      } else {
        flushParagraph();
        inCodeFence = true;
        codeLanguage = line.trim().slice(3).trim() || 'plain text';
      }
      continue;
    }

    if (inCodeFence) {
      buffer.push(line);
      continue;
    }

    if (line.startsWith('|') && isTableSeparator(lines[index + 1] ?? '')) {
      flushParagraph();
      const bodyLines: string[] = [];
      let cursor = index + 2;

      while (cursor < lines.length && (lines[cursor] ?? '').startsWith('|')) {
        bodyLines.push(lines[cursor] ?? '');
        cursor += 1;
      }

      blocks.push(tableBlock(line, bodyLines));
      index = cursor - 1;
      continue;
    }

    const callout = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/.exec(line.trim());

    if (callout) {
      flushParagraph();
      const content: string[] = [];
      let cursor = index + 1;

      while (cursor < lines.length && (lines[cursor] ?? '').trimStart().startsWith('>')) {
        content.push((lines[cursor] ?? '').trimStart().replace(/^>\s?/, ''));
        cursor += 1;
      }

      blocks.push(calloutBlock(callout[1] ?? 'NOTE', content));
      index = cursor - 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);

    if (heading) {
      flushParagraph();
      const level = heading[1]?.length ?? 1;
      const text = heading[2] ?? '';
      blocks.push(
        richTextBlock(level === 1 ? 'heading_1' : level === 2 ? 'heading_2' : 'heading_3', text),
      );
      continue;
    }

    const toDo = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line.trimStart());

    if (toDo) {
      flushParagraph();
      blocks.push(toDoBlock(toDo[2] ?? '', (toDo[1] ?? '').toLowerCase() === 'x'));
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line.trimStart());

    if (bullet) {
      flushParagraph();
      blocks.push(richTextBlock('bulleted_list_item', bullet[1] ?? ''));
      continue;
    }

    const numbered = /^\d+\.\s+(.*)$/.exec(line.trimStart());

    if (numbered) {
      flushParagraph();
      blocks.push(richTextBlock('numbered_list_item', numbered[1] ?? ''));
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line.trimStart());

    if (quote) {
      flushParagraph();
      blocks.push(richTextBlock('quote', quote[1] ?? ''));
      continue;
    }

    if (isDivider(line)) {
      flushParagraph();
      blocks.push(dividerBlock());
      continue;
    }

    const image = IMAGE_PATTERN.exec(line.trim());

    if (image) {
      flushParagraph();
      blocks.push(await resolveImage(image[2] ?? '', image[1] ?? ''));
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      continue;
    }

    buffer.push(line.trim());
  }

  if (inCodeFence && buffer.length > 0) {
    blocks.push(codeBlock(buffer.join('\n'), codeLanguage));
  }

  flushParagraph();

  const headingCount = blocks.filter((block) => block.type.startsWith('heading')).length;

  return headingCount >= 3 ? [tableOfContentsBlock(), ...blocks] : blocks;
}

function blockWeight(block: NotionBlock): number {
  const payload = block[block.type] as { children?: unknown[] } | undefined;
  const children = Array.isArray(payload?.children) ? payload.children.length : 0;

  return 1 + children;
}

/** Chunks blocks without splitting a table from its rows (atomic units). */
export function chunkBlocks(blocks: NotionBlock[], limit: number): NotionBlock[][] {
  const chunks: NotionBlock[][] = [];
  let current: NotionBlock[] = [];
  let weight = 0;

  for (const block of blocks) {
    const size = blockWeight(block);

    if (weight + size > limit && current.length > 0) {
      chunks.push(current);
      current = [];
      weight = 0;
    }

    current.push(block);
    weight += size;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
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
  cloudinaryUrl: string | undefined,
): Promise<string> {
  const markdown = await readFile(resolve(REPOSITORY_ROOT, document.path), 'utf8');
  const resolveImage = createImageResolver(
    cloudinaryUrl,
    resolve(REPOSITORY_ROOT, dirname(document.path)),
  );
  const blocks = await markdownToBlocks(markdown, resolveImage);
  const chunks = chunkBlocks(blocks, BLOCKS_PER_REQUEST);

  const previousPageId = existingPages.get(document.title);

  if (previousPageId) {
    await archivePage(token, previousPageId);
    console.log(`Archived previous "${document.title}" (${previousPageId})`);
  }

  const page = await notionRequest('/pages', token, {
    method: 'POST',
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      icon: { type: 'emoji', emoji: document.icon },
      properties: { title: [{ type: 'text', text: { content: document.title } }] },
      children: chunks[0] ?? [],
    }),
  });

  const pageId = String(page.id);

  for (let index = 1; index < chunks.length; index += 1) {
    await notionRequest(`/blocks/${pageId}/children`, token, {
      method: 'PATCH',
      body: JSON.stringify({ children: chunks[index] }),
    });
  }

  return pageId;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const onlyIndex = process.argv.indexOf('--only');
  const onlyFilter = onlyIndex >= 0 ? (process.argv[onlyIndex + 1] ?? '') : undefined;
  const documents = onlyFilter
    ? DOCUMENTS.filter((document) => document.title.includes(onlyFilter))
    : DOCUMENTS;
  const token = process.env.NOTION_TOKEN;
  const parentPageId = process.env.NOTION_PAGE_ID;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (onlyFilter && documents.length === 0) {
    console.error(`No documents match --only "${onlyFilter}".`);
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    for (const document of documents) {
      const markdown = await readFile(resolve(REPOSITORY_ROOT, document.path), 'utf8');
      const blocks = await markdownToBlocks(markdown, async (url, alt) =>
        imageBlock(`https://placeholder.invalid/${basename(url)}`, alt),
      );
      const tables = blocks.filter((block) => block.type === 'table').length;
      const mermaid = blocks.filter(
        (block) =>
          block.type === 'code' &&
          (block.code as { language?: string } | undefined)?.language === 'mermaid',
      ).length;
      const callouts = blocks.filter((block) => block.type === 'callout').length;
      const toDos = blocks.filter((block) => block.type === 'to_do').length;
      const images = blocks.filter((block) => block.type === 'image').length;

      console.log(
        `${document.title}: ${blocks.length} blocks · ${tables} tables · ${mermaid} mermaid · ` +
          `${callouts} callouts · ${toDos} to-dos · ${images} images (${basename(document.path)})`,
      );
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

  for (const document of documents) {
    const pageId = await publishDocument(
      token,
      parentPageId,
      document,
      existingPages,
      cloudinaryUrl,
    );
    console.log(`Published "${document.title}" → ${pageId}`);
  }
}

await main();
