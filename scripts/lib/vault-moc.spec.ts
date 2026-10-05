import { describe, expect, it } from 'vitest';
import type { DocumentSpec } from './documents.ts';
import { defaultFacts } from './project-facts.ts';
import { renderMoc } from './vault-moc.ts';

/** Minimal spec builder; only the fields the MOC reads are relevant. */
function doc(
  overrides: Pick<DocumentSpec, 'path' | 'obsidianName' | 'obsidianFolder'> & Partial<DocumentSpec>,
): DocumentSpec {
  return {
    notionTitle: `DeckUp — ${overrides.obsidianName}`,
    notionIcon: '📄',
    tags: [],
    ...overrides,
  };
}

const documents: DocumentSpec[] = [
  doc({
    path: 'SPEC.md',
    obsidianName: 'Specification',
    obsidianFolder: 'Gobernanza',
    description: 'stack bloqueado, prohibiciones y convenciones',
  }),
  doc({
    path: 'docs/STATUS.md',
    obsidianName: 'Project Status',
    obsidianFolder: 'Gobernanza',
    description: 'estado vivo del proyecto y backlog',
  }),
  doc({
    path: 'docs/02-architecture/overview.md',
    obsidianName: 'Architecture Overview',
    obsidianFolder: 'Documentación',
    description: 'C4 y Clean Architecture',
  }),
  doc({
    path: 'docs/02-architecture/adr/ADR-0001-monorepo-strategy.md',
    obsidianName: 'ADR-0001 — Monorepo',
    obsidianFolder: 'Decisiones Técnicas',
  }),
];

const facts = { ...defaultFacts(), unitTests: 187, apiIntegration: 72, browserE2e: 8 };

describe('renderMoc', () => {
  const moc = renderMoc(documents, '2026-10-05', facts);

  it('opens with the index frontmatter and the sync date', () => {
    expect(moc).toMatch(/^---\nproyecto: DeckUp\ntipo: índice\nactualizado: 2026-10-05\n/);
    expect(moc).toContain('fuente: repositorio Epic_03_Education');
  });

  it('counts the documents per folder, with correct pluralisation', () => {
    expect(moc).toContain('## Gobernanza (2 notas)');
    expect(moc).toContain('## Documentación (1 nota)');
    expect(moc).toContain('## Decisiones técnicas (1 ADR)');
  });

  it('lists documents with their curated description', () => {
    expect(moc).toContain('- [[Specification]] — stack bloqueado, prohibiciones y convenciones');
    expect(moc).toContain('- [[Architecture Overview]] — C4 y Clean Architecture');
  });

  it('lists ADRs by note name, without a description', () => {
    expect(moc).toContain('- [[ADR-0001 — Monorepo]]');
    expect(moc).not.toContain('- [[ADR-0001 — Monorepo]] —');
  });

  it('filters the Dataview panels by the derived tipo', () => {
    expect(moc).toContain('WHERE tipo = "gobernanza"');
    expect(moc).toContain('WHERE tipo = "documentación"');
    expect(moc).toContain('FROM #deckup AND #adr');
  });

  it('keeps the curated prose and the global panels', () => {
    expect(moc).toContain('## Enlaces oficiales');
    expect(moc).toContain('## Stack');
    expect(moc).toContain('## Cómo usar esta knowledge base');
    expect(moc).toContain('## Recursos');
  });

  it('is deterministic for the same input', () => {
    expect(renderMoc(documents, '2026-10-05', facts)).toBe(moc);
  });

  it('reads the quality numbers from the project facts', () => {
    expect(moc).toContain('| **Calidad** | 187 unit · 72 integración · 8 E2E');
  });
});
