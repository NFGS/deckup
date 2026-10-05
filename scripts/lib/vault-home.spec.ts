import { describe, expect, it } from 'vitest';
import { PROJECTS, renderHome, type IndexEntry } from './vault-home.ts';

const audits: IndexEntry[] = [
  { link: 'Auditorías/2026-10-04-ecosistema', title: 'Auditoría del ecosistema — 2026-10-04' },
  { link: 'Auditorías/2026-10-05-fix-mcp', title: 'Fix — MCP de Obsidian' },
];

const guides: IndexEntry[] = [
  { link: 'Guía — Validación de paneles', title: 'Guía — Validación de paneles' },
];

describe('renderHome', () => {
  const home = renderHome(PROJECTS, audits, guides, '2026-10-05');

  it('opens with the home frontmatter and the sync date', () => {
    expect(home).toMatch(/^---\ntipo: home\nactualizado: 2026-10-05\n/);
  });

  it('lists the curated projects as a table', () => {
    expect(home).toContain('| 🎴 **DeckUp** | Repaso espaciado con flashcards');
    expect(home).toContain('[[DeckUp/README\\|DeckUp — Knowledge Base]]');
    expect(home).toContain('[[Kubo/README\\|Kubo — Knowledge Base]]');
  });

  it('lists the audits and guides with their H1 as display text', () => {
    expect(home).toContain(
      '- [[Auditorías/2026-10-04-ecosistema|Auditoría del ecosistema — 2026-10-04]]',
    );
    expect(home).toContain('- [[Guía — Validación de paneles|Guía — Validación de paneles]]');
  });

  it('keeps the global Dataview panels', () => {
    expect(home).toContain('FROM #deckup OR #kubo OR #agroconnect');
    expect(home).toContain('WHERE estado AND tipo != "plantilla"');
  });

  it('drops the audit and guide sections when there are no entries', () => {
    const bare = renderHome(PROJECTS, [], [], '2026-10-05');
    expect(bare).not.toContain('## Auditorías del ecosistema');
    expect(bare).not.toContain('## Guías del ecosistema');
    expect(bare).toContain('## Proyectos');
  });

  it('is deterministic for the same input', () => {
    expect(renderHome(PROJECTS, audits, guides, '2026-10-05')).toBe(home);
  });
});
