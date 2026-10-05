# SPEC.md — DeckUp

> Project specification. **Read this file at the start of every session.**
> It defines the locked stack, the absolute prohibitions and the versioning strategy.

## 1. Project

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Name         | **DeckUp**                                                                  |
| Epic         | Epic 03 — Education (`REQUIREMENTS.pdf`)                                    |
| Domain       | Spaced-repetition flashcards for high school students preparing final exams |
| Deliverables | (A) User-story refinement · (B) Functional full-stack web application       |
| Language     | English — code, docs and UI                                                 |

## 2. Locked stack decisions

| Layer            | Technology                                                                            |
| ---------------- | ------------------------------------------------------------------------------------- |
| Monorepo         | pnpm workspaces + Turborepo                                                           |
| Web              | React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 4 · TanStack Query 5 · React Router 8 |
| API              | NestJS 12 (Fastify adapter) · TypeScript 6 · Clean Architecture                       |
| Database         | PostgreSQL 17 · Prisma ORM 7 (driver adapter `@prisma/adapter-pg`)                    |
| Scheduling       | FSRS via `ts-fsrs` (Phase 3)                                                          |
| Shared contracts | Zod 4 — `@deckup/shared` (single source of truth for types + runtime validation)      |
| Tests            | Vitest 5 · Testing Library · Supertest · Playwright                                   |
| Tooling          | ESLint 10 · Prettier 3 · Husky · lint-staged · commitlint                             |
| Deployment       | Vercel (web) · Railway (API) · Neon (PostgreSQL)                                      |

> TypeScript is pinned to **6.0.x**: TypeScript 7 is not yet supported by
> `typescript-eslint` and native-decorator tooling (NestJS).

## 3. Absolute prohibitions

1. **No `any`** — use `unknown` plus narrowing. Typed lint rules are enforced.
2. **No secrets in the repository** — environment variables only; document them in `.env.example`.
3. **No raw SQL or direct database access** outside the Prisma repository layer.
4. **No business logic in controllers or React components** — it belongs to the domain/application layers.
5. **No non-conventional commits** — the `commit-msg` hook enforces Conventional Commits.
6. **Never bypass hooks** with `--no-verify`.
7. **No `console.log`** in application code — use the Nest `Logger` (API) or remove before commit (web).
8. **No broken `main`** — the five quality gates must pass before every commit.

## 4. Versioning strategy

- **Commits**: Conventional Commits 1.0.0 (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`, `perf`).
- **Branches**: trunk-based development. Short-lived `feat/*`, `fix/*`, `chore/*` branches merged into a green `main`.
- **Releases**: SemVer tags (`v0.x.y`); release notes generated from commit history.
- **Database**: Prisma migrations are immutable once applied — never edit an applied migration, create a new one.

## 5. Quality gates

```bash
pnpm lint        # ESLint 10 (type-aware)
pnpm typecheck   # tsc --noEmit across workspaces
pnpm test        # Vitest unit/integration
pnpm build       # production builds
pnpm test:e2e    # Playwright smoke (web)
```

## 6. Commands

| Command                                    | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `pnpm dev`                                 | Run web + API in watch mode                    |
| `docker compose up -d`                     | Start PostgreSQL 17 + Adminer (localhost:8080) |
| `pnpm --filter @deckup/api test:e2e`       | API e2e against PostgreSQL                     |
| `pnpm --filter @deckup/api prisma:migrate` | Create/apply a development migration           |
| `pnpm --filter @deckup/api prisma:studio`  | Inspect the database                           |

## 7. Notion

- DeckUp root page ID: **`3ee7d55f-d95e-8079-8ee8-f9dc00042699`**
  (`https://app.notion.com/p/DeckUp-3ee7d55fd95e80798ee8f9dc00042699`).
- Documentation sync: `NOTION_DECKUP_TOKEN=… NOTION_PAGE_ID=3ee7d55f-d95e-8079-8ee8-f9dc00042699 pnpm sync:notion`
  (dry run: add `--dry-run`; single page: add `--only "<substring>"`). Last sync:
  **2026-10-05** — 15 documents published as child pages with rich blocks (native
  tables, Mermaid diagrams, GitHub-style callouts, to-dos and evidence images uploaded
  to Cloudinary). Re-runs update each page in place (same id, blocks swapped).

## 8. Production environment

| Component     | URL / detail                                                                |
| ------------- | --------------------------------------------------------------------------- |
| Web (Vercel)  | <https://deckup.vercel.app> — project `deckup`, root directory `apps/web`   |
| API (Railway) | <https://deckup-api-production.up.railway.app> — service `deckup-api`       |
| Database      | Neon PostgreSQL 17 (`neondb`), migrations applied via the direct connection |

Deploys run through `.github/workflows/deploy.yml` after a green CI on `main`
(or manually with `workflow_dispatch`). The workflow publishes the web app with
`VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. Railway deploys the API
from GitHub on every push to `main` and runs `prisma migrate deploy` as a
pre-deploy command (the `prisma` CLI ships in the production image).

## 9. Skills

| Skill                 | When                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `clean-architecture`  | Any API code (domain/application/infrastructure/presentation)                                         |
| `archify`             | Architecture, workflow, sequence, data-flow and lifecycle diagrams (interactive HTML, PNG/SVG export) |
| `open-design`         | Decks, prototypes, brand design systems and document styling (150+ design systems, 110+ templates)    |
| `screenshot-capture`  | Clean screenshots of the running app for evidence and documentation figures                           |
| `pwa-expert`          | Service workers, manifest, icons, cache strategies and offline behaviour                              |
| `traceability-engine` | Keeping requirements ↔ use cases ↔ user stories ↔ tests in sync                                       |
| `sena-*`              | SENA ADSO templates: requirements, use cases, user stories, UML class diagrams and reports            |

Skills are installed once, globally (`~/.config/opencode/skills/`); the project keeps
no local copies (single source of truth, audited 2026-10-04). The Open Design
catalogue lives at `~/.open-design-skill/repo` (clone of `nexu-io/open-design`).

## 10. Documentation mirrors

The repository `docs/` is the single source of truth. It is mirrored to Notion
and to the Obsidian vault, and every write is recorded in `.sync-manifest.json`
(a content hash per document and target) so the sync is **incremental,
idempotent and verifiable**.

The goal is **alignment, not duplication**: the four environments must never
contradict each other, but each keeps the role that justifies it.

| Environment    | Role            | What it is for                                                  |
| -------------- | --------------- | --------------------------------------------------------------- |
| Repository     | source of truth | versioned markdown, code, CI, the canonical content             |
| GitHub         | transport + CI  | history, review, automation; mirrors Notion on push             |
| Notion         | mirror          | rich reading and sharing (tables, callouts, Mermaid, images)    |
| Obsidian vault | mirror          | local search, graph, wiki-links, offline access, ADR navigation |

- `pnpm sync:all` propagates to both mirrors; `pnpm sync:check` reports drift
  (`--remote` also counts Notion blocks); `pnpm sync:watch` re-syncs on every
  save under `docs/`.
- Triggers: `post-commit` (reminder, or auto-sync with `DECKUP_AUTO_SYNC=1`),
  `post-merge` (re-sync after a pull that touched `docs/`), `pre-push`
  (`sync:check`, blocking only with `DECKUP_SYNC_STRICT=1`) and the
  `docs-sync.yml` workflow (repository → Notion + manifest commit on push).
- Notion is a **read-only mirror**: hand edits are detected by block count and
  reconciled from the repository, which always wins. Re-publishing updates the
  page **in place** (same id, blocks swapped), so the Notion trash stays empty.
- Hashes are **canonical** (Prettier-normalized), so the pre-commit formatter
  never produces spurious drift.
- A document may target only one mirror (`targets` in `scripts/lib/documents.ts`);
  a missing target is never reported as drift. Today every document targets both.
- Notion root page: **DeckUp** (`3ee7d55f-d95e-8079-8ee8-f9dc00042699`).
- Obsidian vault: **Ningendo Bee** (`~/Documents/Obsidian Vaults/Ningendo Bee`,
  override with `OBSIDIAN_VAULT_PATH`); the curated map of content lives at
  `DeckUp/README.md` and the vault-wide `Home.md` connects all projects.
- Last sync: **2026-10-05** — 23 documents (15 documents + 8 ADRs) on both mirrors.
