#!/usr/bin/env node
/**
 * Refreshes the derived fields of `docs/STATUS.md` and the project facts.
 *
 * The status document is a curated narrative, but its date and its document and
 * test counts used to drift by hand. This script is the only writer of
 * `project-facts.json` and resolves the marked regions in `docs/STATUS.md` from
 * it, so the repository, Notion and Obsidian can never disagree.
 *
 * Usage:
 *   pnpm status:refresh                 # unit tests + derived counts (fast)
 *   pnpm status:refresh --no-tests      # keep the recorded unit counts
 *   pnpm status:refresh --with-infra    # also measure API integration + browser E2E
 *   pnpm status:refresh --check         # fail when the marked facts are stale
 *   pnpm status:refresh --dry-run       # show what would change
 *
 * The document counts come from the canonical registry. The unit counts come
 * from an actual `pnpm test` run. `--with-infra` starts the Docker database and
 * measures the API integration suite (Vitest + PostgreSQL) and the browser E2E
 * suite (Playwright), which need Docker and the Playwright browsers; honour
 * `E2E_API_PORT` / `E2E_WEB_PORT` when the default ports are taken.
 *
 * The script is atomic: if a measurement fails it writes nothing, so the facts
 * never record a number that was not actually observed.
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
import { parsePlaywrightTotal, parseVitestCounts, parseVitestTotal } from './lib/test-counts.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const STATUS_PATH = 'docs/STATUS.md';

/** Runs a command in the repository root, capturing stdout. */
function runCommand(command: string): string {
  return execSync(command, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function measureUnitTests(): { total: number; breakdown: string } {
  return parseVitestCounts(runCommand('pnpm test'));
}

function measureApiIntegration(): number {
  runCommand('docker compose up -d --wait db');

  const total = parseVitestTotal(runCommand('pnpm --filter @deckup/api test:e2e'));

  if (total === null) {
    throw new Error('Could not read the API integration test count from the Vitest output.');
  }

  return total;
}

function measureBrowserE2e(): number {
  const total = parsePlaywrightTotal(runCommand('pnpm test:e2e'));

  if (total === null) {
    throw new Error('Could not read the browser E2E count from the Playwright output.');
  }

  return total;
}

async function collectFacts(options: { unit: boolean; infra: boolean }): Promise<ProjectFacts> {
  const previous = await readProjectFacts(REPOSITORY_ROOT);
  const documents = await collectAllDocuments(REPOSITORY_ROOT);
  const adrs = documents.filter((doc) => doc.path.startsWith('docs/02-architecture/adr'));
  const docsFolder = documents.filter((doc) => doc.path.startsWith('docs/'));
  const packageJson = JSON.parse(await readFile(resolve(REPOSITORY_ROOT, 'package.json'), 'utf8'));
  const tests = options.unit ? measureUnitTests() : null;

  return {
    ...previous,
    version: packageJson.version as string,
    updated: new Date().toISOString().slice(0, 10),
    documents: documents.length,
    documentsBreakdown: `${DOCUMENTS.length} documents + ${adrs.length} ADRs`,
    docsFolder: docsFolder.length,
    unitTests: tests?.total ?? previous.unitTests,
    unitTestsBreakdown: tests?.breakdown ?? previous.unitTestsBreakdown,
    apiIntegration: options.infra ? measureApiIntegration() : previous.apiIntegration,
    browserE2e: options.infra ? measureBrowserE2e() : previous.browserE2e,
  };
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const dryRun = process.argv.includes('--dry-run');
  const withInfra = process.argv.includes('--with-infra');
  const useTests = !process.argv.includes('--no-tests') && !check;

  const facts = await collectFacts({ unit: useTests, infra: withInfra && !check });
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

try {
  await main();
} catch (error) {
  console.error(`\nstatus:refresh failed — nothing was written.\n${(error as Error).message}`);
  process.exitCode = 1;
}
