#!/usr/bin/env node
/**
 * Refreshes the derived fields of `docs/STATUS.md` and the project facts.
 *
 * The status document is a curated narrative, but its date, HEAD-independent
 * counts and test numbers used to drift by hand. This script is the only writer
 * of `project-facts.json` and resolves the `{{token}}` placeholders in
 * `docs/STATUS.md` from it, so the repository, Notion and Obsidian can never
 * disagree on those numbers.
 *
 * Usage:
 *   pnpm status:refresh             # run the test suite, then refresh
 *   pnpm status:refresh --no-tests  # keep the recorded test counts
 *   pnpm status:refresh --check     # fail when the placeholders are stale
 *   pnpm status:refresh --dry-run   # show what would change
 *
 * The document counts come from the canonical registry; the test counts come
 * from an actual `pnpm test` run. Counts that need infrastructure (API
 * integration, browser E2E) are preserved from the previous facts file.
 */

import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectAllDocuments, DOCUMENTS } from './lib/documents.ts';
import {
  applyFacts,
  readProjectFacts,
  writeProjectFacts,
  type ProjectFacts,
} from './lib/project-facts.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const STATUS_PATH = 'docs/STATUS.md';

/** Strips the ANSI colours Turbo and Vitest write to a piped stdout. */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

/** Runs the full test suite and returns the total and the per-package breakdown. */
export function parseTestCounts(output: string): { total: number; breakdown: string } {
  const labels: Record<string, string> = { shared: 'shared', api: 'API', web: 'web' };
  const order = ['shared', 'API', 'web', 'scripts'];
  const counts = new Map<string, number>();

  for (const line of stripAnsi(output).split('\n')) {
    const match = /^(?:@deckup\/(\w+):test:\s+)?\s*Tests\s+(\d+)\s+passed/.exec(line);

    if (!match) {
      continue;
    }

    const label = match[1] ? (labels[match[1]] ?? match[1]) : 'scripts';
    counts.set(label, (counts.get(label) ?? 0) + Number(match[2]));
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const breakdown = order
    .filter((label) => counts.has(label))
    .map((label) => `${label} ${counts.get(label)}`)
    .join(' · ');

  return { total, breakdown };
}

function runTests(): { total: number; breakdown: string } {
  const output = execSync('pnpm test', {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return parseTestCounts(output);
}

async function collectFacts(useTests: boolean): Promise<ProjectFacts> {
  const previous = await readProjectFacts(REPOSITORY_ROOT);
  const documents = await collectAllDocuments(REPOSITORY_ROOT);
  const adrs = documents.filter((doc) => doc.path.startsWith('docs/02-architecture/adr'));
  const docsFolder = documents.filter((doc) => doc.path.startsWith('docs/'));
  const packageJson = JSON.parse(await readFile(resolve(REPOSITORY_ROOT, 'package.json'), 'utf8'));
  const tests = useTests ? runTests() : null;

  return {
    ...previous,
    version: packageJson.version as string,
    updated: new Date().toISOString().slice(0, 10),
    documents: documents.length,
    documentsBreakdown: `${DOCUMENTS.length} documents + ${adrs.length} ADRs`,
    docsFolder: docsFolder.length,
    unitTests: tests?.total ?? previous.unitTests,
    unitTestsBreakdown: tests?.breakdown ?? previous.unitTestsBreakdown,
  };
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const dryRun = process.argv.includes('--dry-run');
  const useTests = !process.argv.includes('--no-tests') && !check;

  const facts = await collectFacts(useTests);
  const source = await readFile(resolve(REPOSITORY_ROOT, STATUS_PATH), 'utf8');
  const refreshed = applyFacts(source, facts);

  if (check) {
    if (refreshed === source) {
      console.log('✓ STATUS.md facts are up to date.');
      return;
    }

    console.error('STATUS.md facts are stale — run `pnpm status:refresh`.');
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log(JSON.stringify(facts, null, 2));
    console.log(refreshed === source ? '\nNo changes.' : '\nSTATUS.md would change.');
    return;
  }

  await writeProjectFacts(REPOSITORY_ROOT, facts);
  console.log('written: project-facts.json');

  if (refreshed !== source) {
    await writeFile(resolve(REPOSITORY_ROOT, STATUS_PATH), refreshed, 'utf8');
    console.log(`written: ${STATUS_PATH}`);
  } else {
    console.log(`unchanged: ${STATUS_PATH}`);
  }
}

await main();
