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
 */

import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_VAULT = join(homedir(), 'Documents', 'Obsidian Vaults', 'Ningendo Bee');
const EVIDENCE_SOURCE = 'docs/05-academic/evidencias';

interface NoteSpec {
  name: string;
  path: string;
  folder: 'Documentación' | 'Decisiones Técnicas';
  tags: string[];
}

const DOCUMENT_NOTES: NoteSpec[] = [
  {
    name: 'User Story Refinement',
    path: 'docs/01-requirements/user-story-refinement.md',
    folder: 'Documentación',
    tags: ['requisitos', 'historias-de-usuario'],
  },
  {
    name: 'Traceability Matrix',
    path: 'docs/01-requirements/traceability-matrix.md',
    folder: 'Documentación',
    tags: ['requisitos', 'trazabilidad'],
  },
  {
    name: 'Glossary',
    path: 'docs/01-requirements/glossary.md',
    folder: 'Documentación',
    tags: ['requisitos'],
  },
  {
    name: 'Architecture Overview',
    path: 'docs/02-architecture/overview.md',
    folder: 'Documentación',
    tags: ['arquitectura'],
  },
  {
    name: 'Data Model',
    path: 'docs/02-architecture/data-model.md',
    folder: 'Documentación',
    tags: ['arquitectura', 'datos'],
  },
  {
    name: 'Test Plan',
    path: 'docs/03-testing/test-plan.md',
    folder: 'Documentación',
    tags: ['calidad', 'pruebas'],
  },
  {
    name: 'Test Cases',
    path: 'docs/03-testing/test-cases.md',
    folder: 'Documentación',
    tags: ['calidad', 'pruebas'],
  },
  {
    name: 'Deployment Guide',
    path: 'docs/04-operations/deployment.md',
    folder: 'Documentación',
    tags: ['operación', 'despliegue'],
  },
  {
    name: 'Platform Notes',
    path: 'docs/04-operations/platform-notes.md',
    folder: 'Documentación',
    tags: ['operación', 'despliegue'],
  },
  {
    name: 'Runbook',
    path: 'docs/04-operations/runbook.md',
    folder: 'Documentación',
    tags: ['operación'],
  },
  {
    name: 'Security Notes',
    path: 'docs/04-operations/security.md',
    folder: 'Documentación',
    tags: ['seguridad'],
  },
  {
    name: 'Informe General del Sistema',
    path: 'docs/05-academic/informe-general-sistema.md',
    folder: 'Documentación',
    tags: ['académico', 'sena'],
  },
  {
    name: 'Project Status',
    path: 'docs/STATUS.md',
    folder: 'Documentación',
    tags: ['estado'],
  },
];

function frontmatter(spec: NoteSpec, synced: string): string {
  const tags = ['deckup', ...spec.tags];

  return [
    '---',
    'proyecto: DeckUp',
    `fuente: ${spec.path}`,
    `synced: ${synced}`,
    'tags:',
    ...tags.map((tag) => `  - ${tag}`),
    '---',
    '',
  ].join('\n');
}

/** Converts repository markdown into vault markdown. */
export function toVaultMarkdown(markdown: string): string {
  return (
    markdown
      // Evidence screenshots become local wiki-embeds.
      .replace(/!\[[^\]]*\]\(\.\/evidencias\/([^)]+)\)/g, '![[$1]]')
      // Relative repository links degrade to plain text.
      .replace(/\[([^\]]+)\]\((?:\.\.?\/)[^)]*\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
  );
}

function adrNoteName(heading: string, fallback: string): string {
  const match = /^# ADR (\d{4}): (.+)$/.exec(heading);
  const name = match ? `ADR-${match[1]} — ${match[2]}` : fallback.replace(/\.md$/, '');

  return name.replace(/[/\\]/g, '-');
}

async function collectNotes(synced: string): Promise<Array<{ file: string; content: string }>> {
  const notes: Array<{ file: string; content: string }> = [];

  for (const spec of DOCUMENT_NOTES) {
    const markdown = await readFile(resolve(REPOSITORY_ROOT, spec.path), 'utf8');
    notes.push({
      file: join(spec.folder, `${spec.name}.md`),
      content: frontmatter(spec, synced) + toVaultMarkdown(markdown),
    });
  }

  const adrDirectory = resolve(REPOSITORY_ROOT, 'docs/02-architecture/adr');
  const adrFiles = (await readdir(adrDirectory)).filter((file) => file.endsWith('.md')).sort();

  for (const file of adrFiles) {
    const markdown = await readFile(join(adrDirectory, file), 'utf8');
    const heading = /^# .+$/m.exec(markdown)?.[0] ?? '';
    const name = adrNoteName(heading, file);

    notes.push({
      file: join('Decisiones Técnicas', `${name}.md`),
      content:
        frontmatter(
          {
            name,
            path: `docs/02-architecture/adr/${file}`,
            folder: 'Decisiones Técnicas',
            tags: ['adr', 'arquitectura'],
          },
          synced,
        ) + toVaultMarkdown(markdown),
    });
  }

  return notes;
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
  const vault = process.env.OBSIDIAN_VAULT_PATH ?? DEFAULT_VAULT;

  if (!existsSync(vault)) {
    console.error(`Vault not found: ${vault} (set OBSIDIAN_VAULT_PATH).`);
    process.exitCode = 1;
    return;
  }

  const synced = new Date().toISOString().slice(0, 10);
  const notes = await collectNotes(synced);

  if (dryRun) {
    for (const note of notes) {
      console.log(`would write: DeckUp/${note.file}`);
    }

    const evidence = await copyEvidence(vault, true);
    console.log(`would copy: ${evidence} evidence images to DeckUp/Recursos/evidencias`);
    console.log(`\nDry run finished — ${notes.length} notes, nothing was written.`);
    return;
  }

  for (const note of notes) {
    const target = join(vault, 'DeckUp', note.file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, note.content, 'utf8');
    console.log(`written: DeckUp/${relative(join(vault, 'DeckUp'), target)}`);
  }

  const evidence = await copyEvidence(vault, false);
  console.log(`\nPublished ${notes.length} notes and ${evidence} evidence images to "${vault}".`);
}

await main();
