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
  (`https://app.notion.com/p/3ee7d55fd95e80798ee8f9dc00042699`).
- Documentation sync: `NOTION_TOKEN=… NOTION_PAGE_ID=3ee7d55f-d95e-8079-8ee8-f9dc00042699 pnpm sync:notion`
  (dry run: add `--dry-run`). Last sync: **2026-09-22** — 10 documents published as child
  pages (user stories, traceability, glossary, architecture, data model, test plan,
  test cases, deployment, runbook, security). Re-runs archive the previous version of
  each page before publishing.

## 8. Production environment

| Component     | URL / detail                                                                |
| ------------- | --------------------------------------------------------------------------- |
| Web (Vercel)  | <https://deckup.vercel.app> — project `deckup`, root directory `apps/web`   |
| API (Railway) | <https://deckup-api-production.up.railway.app> — service `deckup-api`       |
| Database      | Neon PostgreSQL 17 (`neondb`), migrations applied via the direct connection |

Deploys run through `.github/workflows/deploy.yml` after a green CI on `main`
(or manually with `workflow_dispatch`). The web job uses `VERCEL_TOKEN`,
`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`; the API job applies migrations with
`DATABASE_URL` and redeploys with `RAILWAY_TOKEN` (Railway project token).

## 9. Skills

| Skill                          | When                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| `clean-architecture`           | Any API code (domain/application/infrastructure/presentation) |
| `swebok-doc-expert`            | Requirements, ADRs, test plans                                |
| `uml-use-case-diagram-builder` | Use-case diagrams                                             |
| `psp-continuous-improvement`   | Estimates and error logs                                      |
| `humanizer`                    | Polishing prose                                               |
