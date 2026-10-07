#!/usr/bin/env node
/**
 * Publishes the DeckUp documentation to the Obsidian vault.
 *
 * Usage:
 *   node --experimental-strip-types scripts/obsidian-sync.ts
 *   node --experimental-strip-types scripts/obsidian-sync.ts --dry-run
 *
 * The vault path comes from OBSIDIAN_VAULT_PATH (default:
 * ~/Documents/Obsidian Vaults/Ningendo Bee). Documents land in
 * DeckUp/Documentación and MADR ADRs in DeckUp/Decisiones Técnicas, with YAML
 * frontmatter for search and tags. Relative links degrade to plain text;
 * evidence screenshots are copied to DeckUp/Recursos/evidencias and embedded
 * as Obsidian wiki-links.
 *
 * The list of documents lives in scripts/lib/documents.ts (shared with the
 * Notion mirror). Every write is recorded in .sync-manifest.json so
 * `pnpm sync:check` can detect hand edits made inside the vault.
 */

import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { collectAllDocuments, documentTargets, type DocumentSpec } from './lib/documents.ts';
import { readProjectFacts, stripFactMarkers } from './lib/project-facts.ts';
import { hashSourceFile, readManifest, sha256, writeManifest } from './lib/sync-manifest.ts';
import { renderHome, PROJECTS, type IndexEntry } from './lib/vault-home.ts';
import { renderMoc } from './lib/vault-moc.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_VAULT = join(homedir(), 'Documents', 'Obsidian Vaults', 'Ningendo Bee');
const EVIDENCE_SOURCE = 'docs/05-academic/evidencias';

/**
 * Extracts the MADR `**Status**: <value>` line from an ADR body so Dataview can
 * group decisions by state. Returns undefined for non-ADR documents.
 */
export function adrStatus(markdown: string): string | undefined {
  return /^\*\*Status\*\*:\s*(.+)$/m.exec(markdown)?.[1]?.trim();
}

/** Dataview `tipo` derived from the destination folder, so panels can filter on it. */
export function noteType(spec: DocumentSpec): string {
  if (spec.obsidianFolder === 'Decisiones Técnicas') return 'adr';
  if (spec.obsidianFolder === 'Gobernanza') return 'gobernanza';

  return 'documentación';
}

function frontmatter(spec: DocumentSpec, synced: string, markdown: string): string {
  const tags = ['deckup', ...spec.tags];
  const isAdr = spec.obsidianFolder === 'Decisiones Técnicas';
  const status = isAdr ? adrStatus(markdown) : undefined;
  const lines = [
    '---',
    'proyecto: DeckUp',
    `tipo: ${noteType(spec)}`,
    `fuente: ${spec.path}`,
    `synced: ${synced}`,
  ];

  if (status) {
    lines.push(`estado: ${status}`);
  }

  lines.push('tags:', ...tags.map((tag) => `  - ${tag}`), '---', '');

  return lines.join('\n');
}

/** Converts repository markdown into vault markdown. */
export function toVaultMarkdown(markdown: string): string {
  return (
    stripFactMarkers(markdown)
      // Evidence screenshots become local wiki-embeds.
      .replace(/!\[[^\]]*\]\(\.\/evidencias\/([^)]+)\)/g, '![[$1]]')
      // Relative repository links degrade to plain text.
      .replace(/\[([^\]]+)\]\((?:\.\.?\/)[^)]*\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
  );
}

interface VaultNote {
  spec: DocumentSpec;
  file: string;
  content: string;
}

async function collectNotes(synced: string, documents: DocumentSpec[]): Promise<VaultNote[]> {
  const notes: VaultNote[] = [];

  for (const spec of documents) {
    const markdown = await readFile(resolve(REPOSITORY_ROOT, spec.path), 'utf8');

    notes.push({
      spec,
      file: join(spec.obsidianFolder, `${spec.obsidianName}.md`),
      content: frontmatter(spec, synced, markdown) + toVaultMarkdown(markdown),
    });
  }

  return notes;
}

/**
 * Collects the index entries of a vault folder (or the vault root) for the home
 * note: every note becomes a wiki-link whose display text is its H1.
 */
async function collectIndexEntries(
  vault: string,
  folder: string | null,
  matches: (file: string) => boolean,
): Promise<IndexEntry[]> {
  const dir = folder ? join(vault, folder) : vault;

  if (!existsSync(dir)) {
    return [];
  }

  const files = (await readdir(dir)).filter((file) => file.endsWith('.md') && matches(file)).sort();
  const entries: IndexEntry[] = [];

  for (const file of files) {
    const content = await readFile(join(dir, file), 'utf8');
    const name = file.replace(/\.md$/, '');
    const title = /^#\s+(.+)$/m.exec(content)?.[1]?.trim() ?? name;

    entries.push({ link: folder ? `${folder}/${name}` : name, title });
  }

  return entries;
}

async function copyEvidence(vault: string, dryRun: boolean): Promise<number> {
  const source = resolve(REPOSITORY_ROOT, EVIDENCE_SOURCE);

  if (!existsSync(source)) {
    return 0;
  }

  const files = (await readdir(source)).filter((file) => file.endsWith('.png'));

  for (const file of files) {
    if (!dryRun) {
      const destination = join(vault, 'DeckUp', 'Recursos', 'evidencias');
      await mkdir(destination, { recursive: true });
      await copyFile(join(source, file), join(destination, file));
    }
  }

  return files.length;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const onlyIndex = process.argv.indexOf('--only');
  const onlyFilter = onlyIndex >= 0 ? (process.argv[onlyIndex + 1] ?? '') : undefined;
  const vault = process.env.OBSIDIAN_VAULT_PATH ?? DEFAULT_VAULT;

  if (!existsSync(vault)) {
    console.error(`Vault not found: ${vault} (set OBSIDIAN_VAULT_PATH).`);
    process.exitCode = 1;
    return;
  }

  const synced = new Date().toISOString();
  const syncedDay = synced.slice(0, 10);
  const allDocuments = await collectAllDocuments(REPOSITORY_ROOT);
  const allNotes = await collectNotes(syncedDay, allDocuments);
  const notes = (
    onlyFilter ? allNotes.filter((note) => note.spec.notionTitle.includes(onlyFilter)) : allNotes
  ).filter((note) => documentTargets(note.spec).includes('obsidian'));

  if (onlyFilter && notes.length === 0) {
    console.error(`No notes match --only "${onlyFilter}".`);
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    for (const note of notes) {
      console.log(`would write: DeckUp/${note.file}`);
    }

    console.log('would write: DeckUp/README.md (regenerated map of content)');
    console.log('would write: Home.md (regenerated vault index)');

    const evidence = await copyEvidence(vault, true);
    console.log(`would copy: ${evidence} evidence images to DeckUp/Recursos/evidencias`);
    console.log(`\nDry run finished — ${notes.length} notes, nothing was written.`);
    return;
  }

  const manifest = await readManifest(REPOSITORY_ROOT);
  let written = 0;
  let skipped = 0;

  for (const note of notes) {
    const sourceHash = await hashSourceFile(REPOSITORY_ROOT, note.spec.path);
    const noteHash = sha256(note.content);
    const previous = manifest.documents[note.spec.path];
    const target = join(vault, 'DeckUp', note.file);
    // Re-write when the repository changed OR the note on disk was edited by hand.
    const matchesDisk = existsSync(target) && sha256(await readFile(target, 'utf8')) === noteHash;
    const unchanged =
      !force &&
      previous?.targets.obsidian?.sourceHash === sourceHash &&
      previous?.targets.obsidian?.hash === noteHash &&
      matchesDisk;

    if (unchanged) {
      skipped += 1;
      continue;
    }

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, note.content, 'utf8');

    // When a document moves to another folder, remove the note left behind so
    // the vault does not accumulate orphaned duplicates.
    const previousPath = previous?.targets.obsidian?.path;
    const currentPath = `DeckUp/${note.file}`;
    if (previousPath && previousPath !== currentPath) {
      const stale = join(vault, previousPath);
      if (existsSync(stale)) {
        await unlink(stale);
        console.log(`moved: ${previousPath} → ${currentPath}`);
      }
    }

    manifest.documents[note.spec.path] = {
      syncedAt: synced,
      targets: {
        ...(previous?.targets ?? {}),
        obsidian: { path: currentPath, hash: noteHash, sourceHash },
      },
    };

    written += 1;
    console.log(`written: DeckUp/${relative(join(vault, 'DeckUp'), target)}`);
  }

  await writeManifest(REPOSITORY_ROOT, manifest);

  // Regenerate the vault map of content from the curated template plus the
  // canonical registry, so the index never drifts from the published set.
  const facts = await readProjectFacts(REPOSITORY_ROOT);
  const mocPath = join(vault, 'DeckUp', 'README.md');
  const moc = renderMoc(allDocuments, syncedDay, facts);
  const mocUnchanged = existsSync(mocPath) && (await readFile(mocPath, 'utf8')) === moc;

  if (!mocUnchanged) {
    await mkdir(dirname(mocPath), { recursive: true });
    await writeFile(mocPath, moc, 'utf8');
    console.log('written: DeckUp/README.md (regenerated map of content)');
  }

  // Regenerate the vault home note: the project table is curated, the audit and
  // guide lists are discovered from the vault, so they never go stale.
  const audits = await collectIndexEntries(vault, 'Auditorías', () => true);
  const guides = await collectIndexEntries(
    vault,
    null,
    (file) => file.startsWith('Guía — ') || file === 'Pendientes del ecosistema.md',
  );
  const homePath = join(vault, 'Home.md');
  const home = renderHome(PROJECTS, audits, guides, syncedDay);
  const homeUnchanged = existsSync(homePath) && (await readFile(homePath, 'utf8')) === home;

  if (!homeUnchanged) {
    await writeFile(homePath, home, 'utf8');
    console.log('written: Home.md (regenerated vault index)');
  }

  const evidence = await copyEvidence(vault, false);
  console.log(
    `\nPublished ${written} notes (${skipped} unchanged) and ${evidence} evidence images to "${vault}".`,
  );
  console.log(`Manifest updated: ${notes.length} entries in .sync-manifest.json.`);
}

await main();
