#!/usr/bin/env node
/**
 * Shared logic for the husky documentation-sync hooks.
 *
 *   post-commit  — a commit touched docs/: remind the author, or auto-sync when
 *                  DECKUP_AUTO_SYNC=1 (background, non-blocking).
 *   post-merge   — a pull/merge touched docs/: same behaviour.
 *   pre-push     — cheap offline checks: mirror drift and stale STATUS
 *                  placeholders. Warns, and blocks the push only when
 *                  DECKUP_SYNC_STRICT=1.
 *
 * Hooks never fail the git operation: they only advise unless strict mode is on.
 */

import { execFileSync, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mode = process.argv[2] ?? 'post-commit';

function git(args) {
  try {
    return execFileSync('git', args, { cwd: REPOSITORY_ROOT, encoding: 'utf8' });
  } catch {
    return '';
  }
}

function changedFiles(args) {
  return git(args)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function touchedDocs(files) {
  return files.some((file) => file.startsWith('docs/') && file.endsWith('.md'));
}

function runSync() {
  const child = spawn(process.execPath, ['--experimental-strip-types', 'scripts/sync-all.ts'], {
    cwd: REPOSITORY_ROOT,
    stdio: 'ignore',
    detached: true,
  });

  child.unref();
}

/** Runs a script with the repository root as cwd; resolves with its exit code. */
function run(script, args = []) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ['--experimental-strip-types', script, ...args], {
      cwd: REPOSITORY_ROOT,
      stdio: 'inherit',
    });

    child.on('close', (code) => resolvePromise(code ?? 0));
  });
}

if (mode === 'pre-push') {
  const syncCode = await run('scripts/sync-check.ts');
  const statusCode = await run('scripts/status-refresh.ts', ['--check']);

  if (syncCode !== 0) {
    console.error(
      '\n⚠  Documentation mirrors are out of sync. Run `pnpm sync:all` before pushing.',
    );
  }

  if (statusCode !== 0) {
    console.error('\n⚠  STATUS.md placeholders are stale. Run `pnpm status:refresh`.');
  }

  if (process.env.DECKUP_SYNC_STRICT === '1' && (syncCode !== 0 || statusCode !== 0)) {
    process.exitCode = 1;
  }
} else {
  const files =
    mode === 'post-merge'
      ? changedFiles(['diff', '--name-only', 'ORIG_HEAD', 'HEAD'])
      : changedFiles(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']);

  if (touchedDocs(files)) {
    if (process.env.DECKUP_AUTO_SYNC === '1') {
      console.log('▸ Documentation changed — syncing Notion and Obsidian in the background.');
      runSync();
    } else {
      console.log(
        '▸ Documentation changed — run `pnpm sync:all` (or `pnpm sync:watch`) to update the mirrors.',
      );
    }
  }
}
