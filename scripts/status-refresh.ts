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
 * `--with-infra` runs a preflight (Docker daemon + Playwright browsers) so it
 * fails in seconds instead of minutes, then starts the database and measures
 * both suites. The browser E2E ports are resolved against the machine: an
 * explicit `E2E_API_PORT` / `E2E_WEB_PORT` wins, otherwise the port declared in
 * `apps/web/.env.local` is honoured, and a free port is picked when the default
 * is taken. `VITE_API_URL` is exported so the web build always points at the
 * API the suite starts.
 *
 * The script is atomic: if a measurement fails it writes nothing, so the facts
 * never record a number that was not actually observed.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectAllDocuments, DOCUMENTS } from './lib/documents.ts';
import {
  apiPortFromUrl,
  findFreePort,
  isPortFree,
  playwrightInstallLocations,
  viteApiUrlFromEnvFile,
} from './lib/infra.ts';
import {
  applyFacts,
  readProjectFacts,
  writeProjectFacts,
  type ProjectFacts,
} from './lib/project-facts.ts';
import { parsePlaywrightTotal, parseVitestCounts, parseVitestTotal } from './lib/test-counts.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const STATUS_PATH = 'docs/STATUS.md';
const WEB_ENV_LOCAL = 'apps/web/.env.local';

/** Runs a command in the repository root, capturing stdout. */
function runCommand(command: string, env: NodeJS.ProcessEnv = process.env): string {
  return execSync(command, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 32 * 1024 * 1024,
    env,
  });
}

async function readFileIfExists(path: string): Promise<string | null> {
  const absolute = resolve(REPOSITORY_ROOT, path);

  return existsSync(absolute) ? readFile(absolute, 'utf8') : null;
}

/** Fails in seconds when the infrastructure `--with-infra` needs is missing. */
function preflightInfra(): void {
  try {
    runCommand('docker info --format "{{.ServerVersion}}"');
  } catch {
    throw new Error(
      'Docker is not available. Start the Docker daemon (or Docker Desktop) and retry --with-infra.',
    );
  }

  const output = runCommand('pnpm exec playwright install --dry-run chromium');
  const missing = playwrightInstallLocations(output).filter((location) => !existsSync(location));

  if (missing.length > 0) {
    throw new Error(
      `Playwright browsers are missing (${missing[0]}). Run \`pnpm exec playwright install chromium\`.`,
    );
  }
}

interface InfraPlan {
  apiPort: number;
  webPort: number;
  env: NodeJS.ProcessEnv;
}

/**
 * Resolves the API and web ports for the browser E2E run, and the environment
 * that keeps the web build and the API the suite starts on the same port.
 */
async function planInfra(): Promise<InfraPlan> {
  const configuredApi = process.env.E2E_API_PORT ? Number(process.env.E2E_API_PORT) : null;

  if (configuredApi !== null && !(await isPortFree(configuredApi))) {
    throw new Error(
      `E2E_API_PORT=${configuredApi} is already in use. Stop that service or pass another port.`,
    );
  }

  const envLocal = await readFileIfExists(WEB_ENV_LOCAL);
  const declared = envLocal ? apiPortFromUrl(viteApiUrlFromEnvFile(envLocal)) : null;
  const preferred = configuredApi ?? declared;
  const apiPort =
    preferred !== null && (await isPortFree(preferred)) ? preferred : await findFreePort(3000);

  const configuredWeb = process.env.E2E_WEB_PORT ? Number(process.env.E2E_WEB_PORT) : null;
  const webPort = configuredWeb ?? ((await isPortFree(5173)) ? 5173 : await findFreePort(5174));

  return {
    apiPort,
    webPort,
    env: {
      ...process.env,
      E2E_API_PORT: String(apiPort),
      E2E_WEB_PORT: String(webPort),
      VITE_API_URL: `http://localhost:${apiPort}/api/v1`,
    },
  };
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

async function measureBrowserE2e(): Promise<number> {
  const plan = await planInfra();
  console.log(`▸ Browser E2E on API :${plan.apiPort} · web :${plan.webPort}`);

  const total = parsePlaywrightTotal(runCommand('pnpm test:e2e', plan.env));

  if (total === null) {
    throw new Error('Could not read the browser E2E count from the Playwright output.');
  }

  return total;
}

async function collectFacts(options: { unit: boolean; infra: boolean }): Promise<ProjectFacts> {
  if (options.infra) {
    preflightInfra();
  }

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
    browserE2e: options.infra ? await measureBrowserE2e() : previous.browserE2e,
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
