# DeckUp

A spaced-repetition flashcard platform for high school students preparing for final exams.

> Epic 03 — Education. Derived from the product requirements deck (`REQUIREMENTS.pdf`).

## Overview

DeckUp lets students create customized digital flashcard decks, enrich cards with
images and hints, import content in bulk, and review material through an
FSRS-based spaced-repetition engine that maximizes retention with minimum
study time.

## Monorepo layout

```
.
├── apps/
│   ├── web/        # React 19 + Vite + Tailwind CSS
│   └── api/        # NestJS 12 + Fastify + Prisma (Clean Architecture)
├── packages/
│   ├── shared/     # Zod schemas, shared types and constants
│   └── config/     # Shared TypeScript presets
├── docs/           # Requirements, architecture, testing, operations
├── e2e/            # Playwright journeys and accessibility scans
├── scripts/        # Automation (Notion sync, seeds)
├── docker-compose.yml
├── PLAN.md         # Remediation plan and current backlog
└── SPEC.md         # Project specification and conventions
```

## Tech stack

| Layer      | Technology                                               |
| ---------- | -------------------------------------------------------- |
| Frontend   | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query |
| Backend    | NestJS 12 (Fastify adapter), Prisma ORM                  |
| Database   | PostgreSQL 17                                            |
| Scheduling | FSRS via `ts-fsrs`                                       |
| Testing    | Vitest, Supertest, Playwright                            |
| Tooling    | pnpm, Turborepo, ESLint, Prettier, Husky, commitlint     |

## Prerequisites

- Node.js 22+
- pnpm 10+ (`corepack enable` recommended)
- Docker (for the local PostgreSQL 17 instance)

## Quickstart

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Start PostgreSQL 17 (and Adminer on http://localhost:8080)
docker compose up -d db

# 3. Configure the API environment
cp apps/api/.env.example apps/api/.env
#    Set DATABASE_URL (default points at the Docker database) and a
#    JWT_ACCESS_SECRET of at least 32 characters.

# 4. Apply the database migrations
pnpm --filter @deckup/api prisma:migrate

# 5. Run the web app and the API in watch mode
pnpm dev
```

The web app runs on http://localhost:5173 and the API on http://localhost:3000
(global prefix `/api/v1`, health check at `/api/v1/health`).

### Optional integrations

| Feature                | Variables                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Card images (required) | `IMAGE_STORAGE=cloudinary`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| AI card generation     | `LLM_PROVIDER=openai`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`                                  |

Both features degrade gracefully when disabled: the API responds `503` with
problem details instead of failing at startup.

Run `pnpm --filter @deckup/api prisma:seed` to create a demo student
(`demo@deckup.local`) with a Biology deck and five cards.

## Commands

| Task            | Command                                                         |
| --------------- | --------------------------------------------------------------- |
| Dev (all)       | `pnpm dev`                                                      |
| Lint            | `pnpm lint`                                                     |
| Typecheck       | `pnpm typecheck`                                                |
| Unit tests      | `pnpm test`                                                     |
| API integration | `docker compose up -d db && pnpm --filter @deckup/api test:e2e` |
| Seed demo data  | `pnpm --filter @deckup/api prisma:seed`                         |
| Browser E2E     | `pnpm test:e2e` (builds, then Playwright)                       |
| Build           | `pnpm build`                                                    |
| Format          | `pnpm format`                                                   |

The first browser E2E run needs the Playwright browsers:
`pnpm exec playwright install chromium`.

If another local service already owns port 3000, point both the API and the
web build at an alternate port (matching `VITE_API_URL` in `apps/web/.env.local`):

```bash
E2E_API_PORT=3100 pnpm test:e2e
```

If port 5173 is taken as well, add `E2E_WEB_PORT=5273` to the same command.

## Documentation

See [`docs/`](./docs) and [`SPEC.md`](./SPEC.md). The current remediation
backlog lives in [`PLAN.md`](./PLAN.md).

The same documentation is published to the Notion workspace (root page
**DeckUp**) with native tables, Mermaid diagrams, callouts and evidence images:

```bash
NOTION_TOKEN=… NOTION_PAGE_ID=3ee7d55f-d95e-8079-8ee8-f9dc00042699 pnpm sync:notion
pnpm sync:notion --dry-run            # preview block counts
pnpm sync:notion --only "Runbook"     # refresh a single page
```

## License

Academic project — Tecnólogo en Análisis y Desarrollo de Software / Ingeniería de Sistemas.
