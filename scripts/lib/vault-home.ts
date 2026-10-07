/**
 * Renders the vault home note (`Home.md`) — the index of the whole vault.
 *
 * `Home.md` spans more than one project (DeckUp, Kubo, AgroConnect), so it does
 * not belong to any single mirror. The curated project table lives here, in the
 * repository that owns **Beekeeper** (the vault tooling); the audit and guide
 * lists are discovered from the vault so they can never go stale, and the global
 * Dataview panels stay dynamic. `obsidian-sync` regenerates the note on every run.
 */

export interface ProjectEntry {
  /** Leading emoji of the project row. */
  emoji: string;
  /** Display name. */
  name: string;
  /** One-line description. */
  description: string;
  /** Vault-relative path of the project's map of content, without `.md`. */
  moc: string;
}

export interface IndexEntry {
  /** Vault-relative link target, without `.md`. */
  link: string;
  /** Display text (the note's H1). */
  title: string;
}

/** Curated projects shown in the home table. */
export const PROJECTS: ProjectEntry[] = [
  {
    emoji: '🎴',
    name: 'DeckUp',
    description: 'Repaso espaciado con flashcards (Epic 03 — Education)',
    moc: 'DeckUp/README',
  },
  {
    emoji: '🌱',
    name: 'AgroConnect',
    description: 'Plataforma agropecuaria B2B+B2C (SENA ADSO)',
    moc: 'AgroConnect/README',
  },
  {
    emoji: '🏪',
    name: 'Kubo',
    description: 'ERP + CRM autoalojable para PYMES (monorepo poliglota, 9 repos)',
    moc: 'Kubo/README',
  },
];

/** A Dataview code block, built without inline fences for readability. */
function panel(query: string): string {
  return ['```dataview', query, '```'].join('\n');
}

function projectRow(project: ProjectEntry): string {
  return `| ${project.emoji} **${project.name}** | ${project.description} | [[${project.moc}\\|${project.name} — Knowledge Base]] |`;
}

function indexList(entries: IndexEntry[]): string {
  return entries.map((entry) => `- [[${entry.link}|${entry.title}]]`).join('\n');
}

const projectsPanel = panel(
  [
    'TABLE length(rows) AS "Notas", max(file.mtime) AS "Última actualización"',
    'FROM #deckup OR #kubo OR #agroconnect',
    'GROUP BY proyecto',
    'SORT length(rows) DESC',
  ].join('\n'),
);

const adrPanel = panel(
  [
    'TABLE proyecto AS "Proyecto", estado AS "Estado", file.mtime AS "Modificado"',
    'FROM (#deckup OR #kubo OR #agroconnect) AND #adr',
    'WHERE estado AND tipo != "plantilla"',
    'SORT proyecto ASC, file.name ASC',
  ].join('\n'),
);

const activityPanel = panel(
  [
    'TABLE proyecto AS "Proyecto", file.folder AS "Carpeta", file.mtime AS "Actualizado"',
    'FROM #deckup OR #kubo OR #agroconnect',
    'SORT file.mtime DESC',
    'LIMIT 15',
  ].join('\n'),
);

export function renderHome(
  projects: ProjectEntry[],
  audits: IndexEntry[],
  guides: IndexEntry[],
  updated: string,
): string {
  const auditSection =
    audits.length > 0 ? `\n## Auditorías del ecosistema\n\n${indexList(audits)}\n` : '';
  const guideSection =
    guides.length > 0 ? `\n## Guías del ecosistema\n\n${indexList(guides)}\n` : '';

  return `---
tipo: home
actualizado: ${updated}
tags:
  - home
---

# 🏠 Home — Ningendo Bee

> Bóveda de conocimiento de **Nelson Fabián Gallego Sánchez** (SENA ADSO · Universidad del Quindío).

## Proyectos

| Proyecto | Descripción | Knowledge Base |
|---|---|---|
${projects.map(projectRow).join('\n')}
${auditSection}${guideSection}
## 📊 Panorama global (Dataview)

> [!tip] Panel dinámico multi-proyecto
> Requiere el plugin **Dataview** habilitado. Si ves bloques de código sin
> renderizar: Ajustes → Plugins de la comunidad → activa **Dataview**.

> [!note] Notas por proyecto
> Cuántas notas tiene cada proyecto en la bóveda.

${projectsPanel}

> [!note] ADRs por estado (los 3 proyectos)
> Decisiones arquitectónicas agrupadas por su estado, sin importar el proyecto.

${adrPanel}

> [!note] Actividad reciente en toda la bóveda
> Las últimas notas tocadas por los syncs, útil para ver qué cambió.

${activityPanel}

## Cómo usar esta bóveda

1. Cada proyecto tiene una nota **README** que actúa como índice (MOC).
2. Las notas llevan *frontmatter* con \`proyecto\`, \`fuente\` y \`tags\` para facilitar búsquedas.
3. Los espejos de documentación se refrescan desde cada repositorio con \`pnpm sync:obsidian\` (vault) y \`pnpm sync:notion\` (Notion).
4. El espejo de **Kubo** se refresca con \`./kubo-infra/scripts/obsidian-sync.sh\` (vault).
5. Esta nota la genera **Beekeeper** — el tooling del vault (\`pnpm sync:obsidian\`); las secciones curadas viven en \`scripts/lib/vault-home.ts\`.
`;
}
