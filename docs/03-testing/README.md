# 03 — Testing

Test strategy and cases for DeckUp.

| File                               | Description                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [`test-plan.md`](./test-plan.md)   | Scope, levels (unit / integration / browser), environments, entry and exit criteria, non-functional budgets |
| [`test-cases.md`](./test-cases.md) | Test case catalog traced to requirements and to the automated suites                                        |

## Tooling

- **Unit**: Vitest 5 (`pnpm test`).
- **API integration/e2e**: Vitest + Supertest against a real PostgreSQL instance
  (`docker compose up -d db`, then `pnpm --filter @deckup/api test:e2e`).
- **Browser E2E**: Playwright against production builds, including WCAG 2.1
  A/AA scans with `@axe-core/playwright` (`pnpm test:e2e`).
