#!/usr/bin/env node
/**
 * Watches the documentation sources and re-syncs every mirror on change.
 *
 * Usage:
 *   pnpm sync:watch
 *
 * Uses the native recursive `fs.watch` (Node >= 20 on Linux), so it adds no
 * dependency. Edits under docs/ are debounced and funnelled through
 * scripts/sync-all.ts, which updates Notion and the Obsidian vault and records
 * the result in .sync-manifest.json. The watcher only covers docs/, so the
 * writes performed by the sync itself can never trigger a feedback loop.
 */

import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { resolve } from 'node:path';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const WATCHED_DIRECTORY = resolve(REPOSITORY_ROOT, 'docs');
const DEBOUNCE_MS = 1_500;

let debounceTimer: NodeJS.Timeout | undefined;
let running = false;
let queuedReason: string | undefined;

function runSync(reason: string): void {
  running = true;
  console.log(`\n▸ Change detected (${reason}) — syncing mirrors…`);

  const child = spawn('node', ['--experimental-strip-types', 'scripts/sync-all.ts'], {
    cwd: REPOSITORY_ROOT,
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    running = false;
    console.log(code === 0 ? '✓ Mirrors in sync.' : `✗ Sync failed (exit ${code}).`);

    if (queuedReason) {
      const reason = queuedReason;
      queuedReason = undefined;
      scheduleSync(reason);
    }
  });
}

function scheduleSync(reason: string): void {
  if (running) {
    queuedReason = reason;
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => runSync(reason), DEBOUNCE_MS);
}

function main(): void {
  console.log(`Watching ${WATCHED_DIRECTORY} for changes (Ctrl+C to stop)…`);
  console.log('Every save re-syncs Notion and the Obsidian vault.\n');

  watch(WATCHED_DIRECTORY, { recursive: true }, (_event, filename) => {
    if (filename && !filename.endsWith('.md')) {
      return;
    }

    scheduleSync(filename ?? 'docs');
  });
}

main();
