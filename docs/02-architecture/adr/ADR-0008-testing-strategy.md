# ADR 0008: Testing strategy — Vitest, Supertest and Playwright

**Date**: 2026-09-22
**Status**: Accepted
**Authors**: Fabián Gallego

## Context

DeckUp's correctness is concentrated in three places: the **scheduling domain** (FSRS
policy, streaks, retention), the **API contracts** (auth, CRUD, imports) and the **study
flow** (the only path that directly delivers user value). A single test technology for all
three would either be too slow (E2E for domain math) or too shallow (unit tests for
integration failures).

The stack is TypeScript-only and already uses Vite, so a Vite-native test runner keeps
configuration minimal.

## Decision

Adopt a three-level pyramid with explicit ownership:

| Level           | Tool               | Scope                                                       | Target                          |
| --------------- | ------------------ | ----------------------------------------------------------- | ------------------------------- |
| **Unit**        | Vitest             | Domain services, value objects, use cases with fake ports   | ≥ 90 % of domain/application    |
| **Integration** | Vitest + Supertest | API endpoints against a real PostgreSQL (Docker/CI service) | All Must/Should requirements    |
| **End-to-end**  | Playwright         | Critical journeys: register → create deck → study → summary | 5–8 stable flows, run on `main` |

Rules:

- **No mocking the database** in integration tests: they run against PostgreSQL 17, the
  same major version as production.
- The FSRS library is replaced by a **deterministic fake scheduler** in unit tests; the
  adapter itself is covered by integration tests.
- Tests are **colocated** with the code (`*.spec.ts`, `*.test.ts(x)`); E2E lives in
  `e2e/` at the repository root.
- Test cases are traced to requirements in
  [`../../01-requirements/traceability-matrix.md`](../../01-requirements/traceability-matrix.md).

## Alternatives considered

1. **Jest everywhere**
   - Pros: NestJS default, huge ecosystem.
   - Contras: slower ESM/TypeScript setup, a second transform pipeline next to Vite, and
     no shared config with the web app.
2. **Vitest for unit/integration + Cypress for E2E**
   - Pros: Cypress has excellent DX and time-travel debugging.
   - Contras: heavier, slower, and Playwright's multi-browser and trace viewer are better
     suited for CI; Cypress adds a second browser driver stack.
3. **Only E2E tests**
   - Pros: highest confidence per test, fewest layers.
   - Contras: slow, flaky at the margins, and the FSRS math (dozens of interval
     transitions) would be impractical to cover through the UI.
4. **Testcontainers for integration tests**
   - Pros: fully isolated, per-suite databases, works without Compose.
   - Contras: heavier CI setup and Docker-in-CI requirements; the project already has a
     PostgreSQL service in CI and Compose locally, so the marginal benefit is low at this
     scale. Revisit if the test suite grows.

## Trade-offs and justification

| Criterion         | Vitest+Supertest+Playwright | Jest+Cypress  | Only E2E | +Testcontainers |
| ----------------- | --------------------------- | ------------- | -------- | --------------- |
| Speed             | ✅                          | ⚠️            | ❌       | ⚠️              |
| Domain coverage   | ✅                          | ✅            | ❌       | ✅              |
| Realism           | ✅ (PG + browser)           | ✅            | ✅       | ✅              |
| Config complexity | ✅ one Vite family          | ⚠️ two stacks | ✅       | ⚠️ higher       |

The pyramid puts the cheapest, fastest tests where the logic is densest (domain), keeps
integration tests honest with a real database, and reserves the browser for journeys that
only make sense end-to-end. Using Vitest on both apps shares configuration knowledge and
keeps the toolchain small.

## Consequences

- **Positive**: fast feedback (`pnpm test` runs in seconds), deterministic domain tests,
  real-database integration tests, browser-level confidence on the value path.
- **Negative / risks**: integration tests require a running PostgreSQL (Compose locally,
  service container in CI); E2E flakiness must be managed with retries and trace artifacts;
  Playwright browsers add ~150 MB to CI cache.
- **Required actions**: CI starts a PostgreSQL service and runs the API integration suite; E2E
  runs on `main` merges and on demand; domain coverage thresholds are enforced through
  `pnpm --filter @deckup/api test:cov`.

## References SWEBOK

- Cap. 5, §3 — Testing: test levels (unit, integration, system).
- Cap. 5, §4 — Testing: test techniques and automation.
- Cap. 5, §5.2 — Testing: coverage and test adequacy.
