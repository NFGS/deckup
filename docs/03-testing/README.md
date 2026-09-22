# 03 — Testing

Test strategy and cases for DeckUp.

## Planned contents

| File            | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `test-plan.md`  | Scope, levels (unit / integration / e2e), environments, entry/exit criteria |
| `test-cases.md` | Test case catalog traced to user stories (TC-xxx)                           |

## Current tooling

- **Unit**: Vitest 5 (`pnpm test`).
- **API integration/e2e**: Vitest + Supertest against a real PostgreSQL instance
  (`docker compose up -d db`, then `pnpm --filter @deckup/api test:e2e`).
- **Web E2E**: Playwright (`pnpm test:e2e`).
