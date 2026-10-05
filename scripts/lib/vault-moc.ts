/**
 * Renders the curated map of content (MOC) for the Obsidian vault.
 *
 * The hand-written prose — identity, official links, diagrams, stack, how-to
 * and resources — lives here, in the repository that is the single source of
 * truth. `obsidian-sync` regenerates `DeckUp/README.md` from this template on
 * every run, so the vault index can never drift, while the curation is
 * preserved (and reviewed) in version control. The document lists and their
 * counts are derived from the canonical registry, so adding a document is
 * enough for it to appear here.
 *
 * Dataview blocks are assembled with a helper instead of inline fences to keep
 * the template literal readable.
 */

import type { DocumentSpec } from './documents.ts';

const PANEL_NOTE = [
  '> [!tip] Panel dinámico',
  '> Requiere el plugin **Dataview** habilitado. Si ves bloques de código sin',
  '> renderizar: Ajustes → Plugins de la comunidad → activa **Dataview**.',
].join('\n');

/** A Dataview code block, built without inline fences for readability. */
function panel(query: string): string {
  return ['```dataview', query, '```'].join('\n');
}

/** `3 notas` / `1 nota` — keeps the section headings grammatical. */
function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

const recentPanel = panel(
  [
    'TABLE file.folder AS "Carpeta", file.mtime AS "Actualizado"',
    'FROM #deckup',
    'SORT file.mtime DESC',
    'LIMIT 10',
  ].join('\n'),
);

const tagPanel = panel(
  [
    'TABLE length(rows) AS "Notas"',
    'FROM #deckup',
    'FLATTEN file.etags AS tag',
    'WHERE tag != "#deckup"',
    'GROUP BY tag',
    'SORT length(rows) DESC',
  ].join('\n'),
);

/** A bulleted list of wiki-links, with the curated description when present. */
function curatedList(documents: DocumentSpec[]): string {
  return documents
    .map((doc) =>
      doc.description
        ? `- [[${doc.obsidianName}]] — ${doc.description}`
        : `- [[${doc.obsidianName}]]`,
    )
    .join('\n');
}

function folderPanel(folder: string): string {
  return panel(
    [
      'TABLE file.folder AS "Carpeta", file.mtime AS "Actualizado"',
      'FROM #deckup',
      `WHERE tipo = "${folder}"`,
      'SORT file.name ASC',
    ].join('\n'),
  );
}

const adrPanel = panel(
  [
    'TABLE estado AS "Estado", file.mtime AS "Modificado"',
    'FROM #deckup AND #adr',
    'WHERE estado AND tipo != "plantilla"',
    'SORT file.name ASC',
  ].join('\n'),
);

export function renderMoc(documents: DocumentSpec[], updated: string): string {
  const governance = documents.filter((doc) => doc.obsidianFolder === 'Gobernanza');
  const documentation = documents.filter((doc) => doc.obsidianFolder === 'Documentación');
  const adrs = documents.filter((doc) => doc.obsidianFolder === 'Decisiones Técnicas');

  return `---
proyecto: DeckUp
tipo: índice
actualizado: ${updated}
fuente: repositorio Epic_03_Education
tags:
  - deckup
  - epic-03
  - education
---

# 🎴 DeckUp — Knowledge Base

> [!info] Punto de entrada
> Índice central del proyecto **DeckUp**. Contiene los enlaces oficiales, los
> diagramas clave y la estructura completa de la documentación. Empieza aquí
> antes de navegar a cualquier otra nota.

## Identidad

| Campo | Valor |
|---|---|
| **Nombre** | DeckUp — plataforma de repaso espaciado con flashcards |
| **Epic** | Epic 03 — Education |
| **Tipo** | Aplicación web full-stack (PWA instalable) |
| **Autor** | Nelson Fabián Gallego Sánchez — SENA ADSO · Universidad del Quindío |
| **Estado** | **v0.1.0** desplegado · infraestructura congelada (sin cambios planificados) |
| **Calidad** | 174 unit · 72 integración · 8 E2E · WCAG 2.1 AA · CI verde |

## Enlaces oficiales

| Recurso | Enlace |
|---|---|
| 🚀 **Aplicación en producción** | <https://deckup.vercel.app> |
| 🔌 **API** (health) | <https://deckup-api-production.up.railway.app/api/v1/health> |
| 🐙 **Repositorio** | <https://github.com/NFGS/deckup> |
| 📓 **Documentación en Notion** | [DeckUp — Documentación](https://app.notion.com/p/DeckUp-3ee7d55fd95e80798ee8f9dc00042699) |
| 🎓 **Informe general (SENA)** | [[Informe General del Sistema]] |

## Diagramas

### System context — C4 nivel 1

![[system-context.png]]

_El estudiante usa DeckUp; el sistema consume Cloudinary (imágenes de tarjetas) y, opcionalmente, un proveedor LLM (generación de tarjetas)._

### Containers — C4 nivel 2

![[containers.png]]

_Web (React 19) → API (NestJS 12, Clean Architecture) → PostgreSQL 17. La web nunca habla directo con la base de datos ni con Cloudinary._

### Despliegue en producción

![[deployment.png]]

_Vercel (web) · Railway (contenedor API) · Neon (PostgreSQL 17) · Cloudinary (CDN de imágenes)._

### Ciclo de vida de una tarjeta (FSRS)

![[fsrs-lifecycle.png]]

_\`NEW → LEARNING → REVIEW\`; un \`Again\` después de graduarse es un lapso: \`RELEARNING\` hasta volver a \`REVIEW\`._

## Gobernanza (${count(governance.length, 'nota', 'notas')})

${PANEL_NOTE}

${folderPanel('gobernanza')}

### Índice curado

${curatedList(governance)}

## Documentación (${count(documentation.length, 'nota', 'notas')})

${PANEL_NOTE}

${folderPanel('documentación')}

### Índice curado

${curatedList(documentation)}

## Decisiones técnicas (${count(adrs.length, 'ADR', 'ADRs')})

> [!tip] Panel dinámico — ADRs por estado
> Se alimenta del campo \`estado\` que el sync extrae del \`**Status**\` de cada MADR.

${adrPanel}

### Índice curado

${curatedList(adrs)}

## Panorama dinámico

> [!tip] Notas por tag
> Distribución del conocimiento por tema (excluye el tag de proyecto).

${tagPanel}

> [!tip] Actualizadas recientemente
> Las últimas notas tocadas por el sync, útil para ver qué cambió.

${recentPanel}

## Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 · Vite 8 · Tailwind CSS 4 · TanStack Query 5 · PWA |
| **Backend** | NestJS 12 (Fastify) · TypeScript · Clean Architecture |
| **Datos** | PostgreSQL 17 · Prisma 7 |
| **Programación** | FSRS vía \`ts-fsrs\` detrás de un puerto de dominio |
| **Contratos** | Zod 4 compartido (\`@deckup/shared\`) |
| **Calidad** | Vitest · Supertest · Playwright + axe-core |
| **Producción** | Vercel · Railway · Neon · Cloudinary |

## Cómo usar esta knowledge base

1. Consulta esta nota índice antes de avanzar en cualquier tema del proyecto.
2. La documentación oficial vive en **Notion** (enlazada arriba); estas notas son su espejo local para búsqueda, enlaces y grafo.
3. Para cualquier decisión técnica nueva, revisa primero [[ADR-0001 — Monorepo with pnpm workspaces and Turborepo|los ADRs]].
4. El estado vivo del proyecto está en [[Project Status]].
5. Refresca este espejo desde el repositorio con \`pnpm sync:all\` (Notion + vault). \`pnpm sync:watch\` re-sincroniza al guardar y \`pnpm sync:check\` detecta cambios hechos a mano en cualquiera de los cuatro entornos.

## Recursos

- **Diagramas**: \`DeckUp/Recursos/\` (PNG de alta resolución, exportados con la skill \`archify\`).
- **Evidencias**: \`DeckUp/Recursos/evidencias/\` (12 capturas del sistema en ejecución).
- **Código fuente**: [github.com/NFGS/deckup](https://github.com/NFGS/deckup) — carpeta \`docs/\` como fuente de verdad.

## Tags

#deckup #epic-03 #education #fsrs #spaced-repetition
`;
}
