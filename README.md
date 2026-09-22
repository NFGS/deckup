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
│   ├── web/        # React 19 + Vite + Tailwind CSS + shadcn/ui
│   └── api/        # NestJS + Fastify + Prisma (Clean Architecture)
├── packages/
│   ├── shared/     # Zod schemas, shared types and constants
│   └── config/     # Shared ESLint / TypeScript / Prettier presets
├── docs/           # Requirements, architecture, testing, operations
├── scripts/        # Automation (Notion sync, seeds)
├── docker-compose.yml
└── SPEC.md         # Project specification and conventions
```

## Tech stack

| Layer      | Technology                                               |
| ---------- | -------------------------------------------------------- |
| Frontend   | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query |
| Backend    | NestJS 11 (Fastify adapter), Prisma ORM                  |
| Database   | PostgreSQL 17                                            |
| Scheduling | FSRS via `ts-fsrs`                                       |
| Testing    | Vitest, Supertest, Playwright                            |
| Tooling    | pnpm, Turborepo, ESLint, Prettier, Husky, commitlint     |

## Quickstart

> Commands are finalized during Phase 0. Placeholder:

```bash
pnpm install
docker compose up -d
pnpm dev
```

## Documentation

See [`docs/`](./docs) and [`SPEC.md`](./SPEC.md).

## License

Academic project — Tecnólogo en Análisis y Desarrollo de Software / Ingeniería de Sistemas.
