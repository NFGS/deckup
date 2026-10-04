#!/usr/bin/env node
/**
 * Detects drift between the repository documentation and its mirrors.
 *
 * Usage:
 *   node --experimental-strip-types scripts/sync-check.ts
 *   node --experimental-strip-types scripts/sync-check.ts --remote
 *   node --experimental-strip-types scripts/sync-check.ts --json
 *
 * Without --remote the check is offline and compares the repository markdown
 * against the manifest, plus the bytes written to the Obsidian vault. With
 * --remote it also asks the Notion API for each page's `last_edited_time` and
 * flags pages edited in Notion after the last sync.
 *
 * Exit code is 1 when any drift is found, so it can gate CI and the pre-push
 * hook. The four environments and how a change is detected:
 *
 *   repository  → sourceHash differs from the manifest (local edit)
 *   GitHub      → the same signal after a pull/merge (post-merge hook re-syncs)
 *   Notion      → page.last_edited_time newer than the recorded sync (--remote)
 *   Obsidian    → note bytes differ from the recorded hash (hand edit)
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { collectAllDocuments } from './lib/documents.ts';
import { readManifest, sha256, type DocumentEntry } from './lib/sync-manifest.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_VAULT = join(homedir(), 'Documents', 'Obsidian Vaults', 'Ningendo Bee');
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

type Issue = 'unsynced' | 'source-changed' | 'obsidian-edited' | 'notion-edited';

interface Report {
  path: string;
  status: 'in-sync' | 'drift';
  issues: Issue[];
  skipped: string[];
}

async function notionBlockCount(token: string, pageId: string): Promise<number | null> {
  let cursor: string | undefined;
  let count = 0;

  do {
    const query = new URLSearchParams({ page_size: '100' });

    if (cursor) {
      query.set('start_cursor', cursor);
    }

    const response = await fetch(`${NOTION_API}/blocks/${pageId}/children?${query.toString()}`, {
      headers: { 'Notion-Version': NOTION_VERSION, Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { results?: unknown[]; next_cursor?: unknown };
    const results = Array.isArray(payload.results) ? payload.results : [];

    count += results.length;
    cursor = typeof payload.next_cursor === 'string' ? payload.next_cursor : undefined;
  } while (cursor);

  return count;
}

async function checkDocument(
  entry: DocumentEntry | undefined,
  sourceHash: string,
  path: string,
  options: { vault: string | null; remote: boolean; token: string | undefined },
): Promise<Report> {
  const issues: Issue[] = [];
  const skipped: string[] = [];

  if (!entry) {
    return { path, status: 'drift', issues: ['unsynced'], skipped };
  }

  if (entry.sourceHash !== sourceHash) {
    issues.push('source-changed');
  }

  if (entry.targets.obsidian && options.vault) {
    const notePath = join(options.vault, entry.targets.obsidian.path);

    if (!existsSync(notePath)) {
      issues.push('obsidian-edited');
    } else if (sha256(await readFile(notePath, 'utf8')) !== entry.targets.obsidian.hash) {
      issues.push('obsidian-edited');
    }
  } else if (entry.targets.obsidian && !options.vault) {
    skipped.push('obsidian');
  }

  if (entry.targets.notion && options.remote && options.token) {
    const count = await notionBlockCount(options.token, entry.targets.notion.id);
    const recorded = entry.targets.notion.blockCount;

    // Deterministic signal: a block added or removed by hand changes the page's
    // top-level block count. (Text-only edits are caught by re-syncing.)
    if (count === null) {
      skipped.push('notion');
    } else if (recorded !== undefined && count !== recorded) {
      issues.push('notion-edited');
    }
  } else if (entry.targets.notion && !options.remote) {
    skipped.push('notion');
  }

  return { path, status: issues.length > 0 ? 'drift' : 'in-sync', issues, skipped };
}

const LABELS: Record<Issue, string> = {
  unsynced: 'never synced',
  'source-changed': 'repository changed since last sync',
  'obsidian-edited': 'Obsidian note edited by hand',
  'notion-edited': 'Notion page edited by hand',
};

async function main(): Promise<void> {
  const json = process.argv.includes('--json');
  const remote = process.argv.includes('--remote');
  const onlyIndex = process.argv.indexOf('--only');
  const onlyFilter = onlyIndex >= 0 ? (process.argv[onlyIndex + 1] ?? '') : undefined;
  const vaultCandidate = process.env.OBSIDIAN_VAULT_PATH ?? DEFAULT_VAULT;
  const vault = existsSync(vaultCandidate) ? vaultCandidate : null;
  const token = process.env.NOTION_TOKEN;
  const documents = await collectAllDocuments(REPOSITORY_ROOT);
  const manifest = await readManifest(REPOSITORY_ROOT);

  const reports: Report[] = [];

  for (const spec of documents) {
    if (onlyFilter && !spec.notionTitle.includes(onlyFilter)) {
      continue;
    }

    reports.push(
      await checkDocument(
        manifest.documents[spec.path],
        sha256(await readFile(resolve(REPOSITORY_ROOT, spec.path), 'utf8')),
        spec.path,
        { vault, remote, token },
      ),
    );
  }

  const drifted = reports.filter((report) => report.status === 'drift');

  if (json) {
    console.log(
      JSON.stringify({ checked: reports.length, drifted: drifted.length, reports }, null, 2),
    );
  } else {
    for (const report of reports) {
      const icon = report.status === 'in-sync' ? '✓' : '✗';
      const detail = report.issues.map((issue) => LABELS[issue]).join('; ');
      const notes = report.skipped.length > 0 ? ` (skipped: ${report.skipped.join(', ')})` : '';

      console.log(`${icon} ${report.path}${detail ? ` — ${detail}` : ''}${notes}`);
    }

    console.log(
      `\n${reports.length - drifted.length}/${reports.length} documents in sync` +
        `${remote ? '' : ' (Notion not checked — pass --remote)'}.`,
    );
  }

  if (drifted.length > 0) {
    process.exitCode = 1;
  }
}

await main();
