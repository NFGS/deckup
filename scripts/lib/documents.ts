/**
 * Canonical documentation registry.
 *
 * Single source of truth for the list of documents that are mirrored to Notion
 * and Obsidian. Both sync scripts consume this module so the two mirrors can
 * never drift apart in *which* documents they publish — only the rendering
 * differs. The 8 MADR ADRs are discovered from disk, so adding one file is
 * enough for it to reach every mirror.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export type ObsidianFolder = 'Documentación' | 'Decisiones Técnicas';
export type SyncTarget = 'notion' | 'obsidian';

export interface DocumentSpec {
  /** Repository-relative path of the source markdown. */
  path: string;
  /** Notion child page title. */
  notionTitle: string;
  /** Notion page icon (emoji). */
  notionIcon: string;
  /** Obsidian note name, without the `.md` extension. */
  obsidianName: string;
  /** Destination folder inside the vault. */
  obsidianFolder: ObsidianFolder;
  /** Obsidian tags, without the implicit `deckup` project tag. */
  tags: string[];
  /**
   * Mirrors this document is published to. Defaults to both. Each environment
   * has its own strengths, so a document may deliberately live in only one of
   * them; the manifest tracks targets independently and never reports a
   * missing target as drift.
   */
  targets?: SyncTarget[];
}

/** The targets a document is published to (both, unless declared otherwise). */
export function documentTargets(spec: DocumentSpec): SyncTarget[] {
  return spec.targets ?? ['notion', 'obsidian'];
}

export const ADR_DIRECTORY = 'docs/02-architecture/adr';

export const DOCUMENTS: DocumentSpec[] = [
  {
    path: 'docs/01-requirements/user-story-refinement.md',
    notionTitle: 'DeckUp — User Story Refinement',
    notionIcon: '📝',
    obsidianName: 'User Story Refinement',
    obsidianFolder: 'Documentación',
    tags: ['requisitos', 'historias-de-usuario'],
  },
  {
    path: 'docs/01-requirements/traceability-matrix.md',
    notionTitle: 'DeckUp — Traceability Matrix',
    notionIcon: '🔗',
    obsidianName: 'Traceability Matrix',
    obsidianFolder: 'Documentación',
    tags: ['requisitos', 'trazabilidad'],
  },
  {
    path: 'docs/01-requirements/glossary.md',
    notionTitle: 'DeckUp — Glossary',
    notionIcon: '📖',
    obsidianName: 'Glossary',
    obsidianFolder: 'Documentación',
    tags: ['requisitos'],
  },
  {
    path: 'docs/02-architecture/overview.md',
    notionTitle: 'DeckUp — Architecture Overview',
    notionIcon: '🏛️',
    obsidianName: 'Architecture Overview',
    obsidianFolder: 'Documentación',
    tags: ['arquitectura'],
  },
  {
    path: 'docs/02-architecture/data-model.md',
    notionTitle: 'DeckUp — Data Model',
    notionIcon: '🗄️',
    obsidianName: 'Data Model',
    obsidianFolder: 'Documentación',
    tags: ['arquitectura', 'datos'],
  },
  {
    path: 'docs/03-testing/test-plan.md',
    notionTitle: 'DeckUp — Test Plan',
    notionIcon: '🧪',
    obsidianName: 'Test Plan',
    obsidianFolder: 'Documentación',
    tags: ['calidad', 'pruebas'],
  },
  {
    path: 'docs/03-testing/test-cases.md',
    notionTitle: 'DeckUp — Test Cases',
    notionIcon: '✅',
    obsidianName: 'Test Cases',
    obsidianFolder: 'Documentación',
    tags: ['calidad', 'pruebas'],
  },
  {
    path: 'docs/04-operations/deployment.md',
    notionTitle: 'DeckUp — Deployment Guide',
    notionIcon: '🚀',
    obsidianName: 'Deployment Guide',
    obsidianFolder: 'Documentación',
    tags: ['operación', 'despliegue'],
  },
  {
    path: 'docs/04-operations/platform-notes.md',
    notionTitle: 'DeckUp — Platform Notes',
    notionIcon: '🧭',
    obsidianName: 'Platform Notes',
    obsidianFolder: 'Documentación',
    tags: ['operación', 'despliegue'],
  },
  {
    path: 'docs/04-operations/runbook.md',
    notionTitle: 'DeckUp — Runbook',
    notionIcon: '🛠️',
    obsidianName: 'Runbook',
    obsidianFolder: 'Documentación',
    tags: ['operación'],
  },
  {
    path: 'docs/04-operations/security.md',
    notionTitle: 'DeckUp — Security Notes',
    notionIcon: '🔒',
    obsidianName: 'Security Notes',
    obsidianFolder: 'Documentación',
    tags: ['seguridad'],
  },
  {
    path: 'docs/04-operations/backup-policy.md',
    notionTitle: 'DeckUp — Backup Policy',
    notionIcon: '💾',
    obsidianName: 'Backup Policy',
    obsidianFolder: 'Documentación',
    tags: ['operación', 'respaldos'],
  },
  {
    path: 'docs/04-operations/deployment-walkthrough.md',
    notionTitle: 'DeckUp — Deployment Walkthrough',
    notionIcon: '🧭',
    obsidianName: 'Deployment Walkthrough',
    obsidianFolder: 'Documentación',
    tags: ['operación', 'despliegue'],
  },
  {
    path: 'docs/05-academic/informe-general-sistema.md',
    notionTitle: 'DeckUp — Informe General del Sistema',
    notionIcon: '🎓',
    obsidianName: 'Informe General del Sistema',
    obsidianFolder: 'Documentación',
    tags: ['académico', 'sena'],
  },
  {
    path: 'docs/STATUS.md',
    notionTitle: 'DeckUp — Project Status',
    notionIcon: '📊',
    obsidianName: 'Project Status',
    obsidianFolder: 'Documentación',
    tags: ['estado'],
  },
];

/** Derives a filesystem-safe Obsidian note name from an ADR heading. */
export function adrNoteName(heading: string, fallback: string): string {
  const match = /^# ADR (\d{4}): (.+)$/.exec(heading);
  const name = match ? `ADR-${match[1]} — ${match[2]}` : fallback.replace(/\.md$/, '');

  return name.replace(/[/\\]/g, '-');
}

/**
 * Discovers the MADR ADRs on disk. A new file in `docs/02-architecture/adr`
 * is automatically mirrored without touching this registry.
 */
export async function collectAdrDocuments(repositoryRoot: string): Promise<DocumentSpec[]> {
  const directory = resolve(repositoryRoot, ADR_DIRECTORY);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md')).sort();
  const specs: DocumentSpec[] = [];

  for (const file of files) {
    const markdown = await readFile(join(directory, file), 'utf8');
    const heading = /^# .+$/m.exec(markdown)?.[0] ?? '';
    const name = adrNoteName(heading, file);

    specs.push({
      path: `${ADR_DIRECTORY}/${file}`,
      notionTitle: `DeckUp — ${name}`,
      notionIcon: '📐',
      obsidianName: name,
      obsidianFolder: 'Decisiones Técnicas',
      tags: ['adr', 'arquitectura'],
    });
  }

  return specs;
}

/** Every document that must be present in every mirror. */
export async function collectAllDocuments(repositoryRoot: string): Promise<DocumentSpec[]> {
  return [...DOCUMENTS, ...(await collectAdrDocuments(repositoryRoot))];
}
