/**
 * Synchronization manifest.
 *
 * Records, per source document and per target, what was published last: a
 * content hash and (for Notion) the page id and its `last_edited_time`. The
 * manifest is what turns the mirrors from "fire and forget" into a verifiable,
 * idempotent synchronization:
 *
 * - `sourceHash`  — the repository markdown at the last sync. If the current
 *                   hash differs, the repository changed and the mirrors are
 *                   stale (local drift).
 * - `obsidian.hash` — the bytes written to the vault. If the file changed since,
 *                   someone edited the vault by hand (remote drift).
 * - `notion.lastEditedTime` — the page's `last_edited_time`. A Notion page
 *                   returns a newer timestamp than the one we recorded when a
 *                   human edited it (remote drift).
 *
 * The manifest is committed to the repository so CI can verify that a push to
 * `main` left both mirrors up to date.
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DocumentSpec } from './documents.ts';

export const MANIFEST_FILE = '.sync-manifest.json';
export const MANIFEST_VERSION = 1;

export interface NotionTarget {
  id: string;
  lastEditedTime: string;
  /** Number of top-level blocks published; the runtime drift signal. */
  blockCount?: number;
}

export interface ObsidianTarget {
  path: string;
  hash: string;
}

export interface DocumentEntry {
  sourceHash: string;
  syncedAt: string;
  targets: {
    notion?: NotionTarget;
    obsidian?: ObsidianTarget;
  };
}

export interface SyncManifest {
  version: number;
  documents: Record<string, DocumentEntry>;
}

export interface DocumentState {
  spec: DocumentSpec;
  sourceHash: string;
  entry: DocumentEntry | undefined;
}

export function sha256(input: string | Uint8Array): string {
  return `sha256-${createHash('sha256').update(input).digest('hex')}`;
}

export async function readManifest(repositoryRoot: string): Promise<SyncManifest> {
  const path = resolve(repositoryRoot, MANIFEST_FILE);

  if (!existsSync(path)) {
    return { version: MANIFEST_VERSION, documents: {} };
  }

  return JSON.parse(await readFile(path, 'utf8')) as SyncManifest;
}

/** Writes the manifest with sorted keys so the diff stays readable. */
export async function writeManifest(repositoryRoot: string, manifest: SyncManifest): Promise<void> {
  const documents: Record<string, DocumentEntry> = {};

  for (const key of Object.keys(manifest.documents).sort()) {
    documents[key] = manifest.documents[key] as DocumentEntry;
  }

  const payload = { version: manifest.version, documents };
  const path = resolve(repositoryRoot, MANIFEST_FILE);

  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

/** Builds the state of every document against the manifest. */
export async function collectDocumentStates(
  repositoryRoot: string,
  specs: DocumentSpec[],
): Promise<DocumentState[]> {
  const manifest = await readManifest(repositoryRoot);
  const states: DocumentState[] = [];

  for (const spec of specs) {
    const content = await readFile(resolve(repositoryRoot, spec.path), 'utf8');

    states.push({
      spec,
      sourceHash: sha256(content),
      entry: manifest.documents[spec.path],
    });
  }

  return states;
}
