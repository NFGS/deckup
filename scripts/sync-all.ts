#!/usr/bin/env node
/**
 * Propagates the repository documentation to every mirror.
 *
 * Usage:
 *   pnpm sync:all                # Notion + Obsidian
 *   pnpm sync:all --dry-run
 *   pnpm sync:all --only "Runbook"
 *   pnpm sync:check              # detect drift without writing (offline)
 *   pnpm sync:check --remote     # also ask Notion for hand edits
 *
 * This is the single command behind every trigger: the post-commit and
 * post-merge hooks, the file watcher and the CI workflow all converge here.
 * Each underlying script records what it published in .sync-manifest.json.
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');

const FLAGS = new Set(['--dry-run', '--force']);
const VALUE_FLAGS = new Set(['--only']);

function passthroughArgs(): string[] {
  const args = process.argv.slice(2);
  const passed: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';

    if (FLAGS.has(arg)) {
      passed.push(arg);
    } else if (VALUE_FLAGS.has(arg)) {
      passed.push(arg, args[index + 1] ?? '');
      index += 1;
    }
  }

  return passed;
}

function run(script: string, args: string[]): Promise<number> {
  return new Promise((resolvePromise) => {
    const child = spawn('node', ['--experimental-strip-types', script, ...args], {
      cwd: REPOSITORY_ROOT,
      stdio: 'inherit',
    });

    child.on('close', (code) => resolvePromise(code ?? 1));
  });
}

async function main(): Promise<void> {
  const args = passthroughArgs();
  const targets = [
    { name: 'Obsidian', script: 'scripts/obsidian-sync.ts' },
    { name: 'Notion', script: 'scripts/notion-sync.ts' },
  ];
  const failed: string[] = [];

  for (const target of targets) {
    console.log(`\n── ${target.name} ─────────────────────────────`);
    const code = await run(target.script, args);

    if (code !== 0) {
      failed.push(target.name);
    }
  }

  console.log('\n── Summary ─────────────────────────────────');
  console.log(
    failed.length === 0
      ? `All mirrors updated: ${targets.map((target) => target.name).join(' + ')}.`
      : `Failed: ${failed.join(', ')}.`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

await main();
