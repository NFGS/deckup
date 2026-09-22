# AGENTS.md — DeckUp

Project-specific instructions for AI agents. Global rules live in `~/.config/opencode/AGENTS.md`.
**Read `SPEC.md` first, always.**

## Commands

| Task       | Command                                                         |
| ---------- | --------------------------------------------------------------- |
| Install    | `pnpm install`                                                  |
| Dev (all)  | `pnpm dev`                                                      |
| Dev (web)  | `pnpm --filter @deckup/web dev`                                 |
| Dev (API)  | `pnpm --filter @deckup/api dev`                                 |
| Lint       | `pnpm lint`                                                     |
| Typecheck  | `pnpm typecheck`                                                |
| Unit tests | `pnpm test`                                                     |
| API e2e    | `docker compose up -d db && pnpm --filter @deckup/api test:e2e` |
| Web e2e    | `pnpm test:e2e`                                                 |
| Build      | `pnpm build`                                                    |
| Format     | `pnpm format`                                                   |

## Architecture rules

### API (`apps/api`) — Clean Architecture

```
src/
├── domain/          # entities, value objects, domain services, repository ports
├── application/     # use cases (one class per use case), DTOs, ports
├── infrastructure/  # Prisma repositories, external adapters (Cloudinary, LLM, FSRS)
└── presentation/    # controllers, request/response schemas, guards, pipes
```

- Dependencies point **inwards**: presentation → application → domain; infrastructure implements domain ports.
- The domain layer imports nothing from NestJS, Prisma or HTTP.
- Controllers only translate HTTP ↔ use cases.

### Web (`apps/web`)

- Feature-first structure (`src/features/<feature>/…`) introduced in Phase 4.
- Server state through TanStack Query only; never `fetch` inside components.
- Shared runtime contracts come from `@deckup/shared` (Zod).

## Conventions

- **English** for code, comments, docs, commits and UI copy.
- **Conventional Commits** (enforced by the `commit-msg` hook).
- **Tests are colocated** (`*.spec.ts`, `*.test.ts(x)`) and must cover domain rules.
- **Zod schemas live in `@deckup/shared`** — never duplicate a contract in an app.
- No comments in code unless they explain non-obvious intent (WHY, not WHAT).
- Generated code (`apps/api/src/generated/**`) is never edited by hand.

## Before finishing any task

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Report the exact commands executed and their result. Never claim success without running them.
