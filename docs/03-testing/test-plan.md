# Test Plan — DeckUp

| Field       | Value                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Version** | 1.0                                                                                                                           |
| **Date**    | 2026-09-22                                                                                                                    |
| **Scope**   | DeckUp monorepo (`apps/web`, `apps/api`, `packages/shared`)                                                                   |
| **Method**  | SWEBOK V4.0a, KA05 (Software Testing) §3–§5                                                                                   |
| **Related** | [`test-cases.md`](./test-cases.md) · [`../01-requirements/traceability-matrix.md`](../01-requirements/traceability-matrix.md) |

---

## 1. Objectives

1. Verify that every Must/Should requirement behaves as specified in
   [`user-story-refinement.md`](../01-requirements/user-story-refinement.md).
2. Protect the domain rules that carry the product's value: FSRS scheduling,
   streak, retention, import validation and ownership isolation.
3. Give the team a fast, deterministic signal on every push (quality gates) and
   a slower, high-confidence signal on the critical user journeys.

## 2. Test levels

| Level             | Tool                               | What it covers                                                             | Where it runs                        |
| ----------------- | ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| **Unit**          | Vitest                             | Domain entities, value objects, domain services, use cases with fake ports | `pnpm test`                          |
| **Integration**   | Vitest + Supertest + PostgreSQL 17 | HTTP endpoints, persistence, transactions, auth flows                      | `pnpm --filter @deckup/api test:e2e` |
| **Browser (E2E)** | Playwright (+ axe-core)            | Critical journeys against production builds                                | `pnpm test:e2e`                      |

### 2.1 Unit tests

- Domain and application code is tested without HTTP, database or framework.
- Ports are replaced by in-memory doubles (`apps/api/src/testing/fakes`).
- The FSRS adapter is tested against the real `ts-fsrs` library (deterministic
  assertions on state transitions and interval ordering).
- Coverage floor enforced by `pnpm --filter @deckup/api test:cov` for `src/domain`:
  80 % statements, 85 % branches, 75 % functions, 80 % lines. Application use
  cases are verified by the integration suite rather than unit coverage.

### 2.2 Integration tests

- The API is bootstrapped exactly like production (`registerPlugins`) and runs
  against a **real PostgreSQL 17** instance (`deckup_test`, created and migrated
  automatically by `test/global-setup.ts`).
- Each test starts from a truncated database; the throttler storage is replaced
  with a permissive double except in the dedicated throttling spec.
- No mocking of the database: the same major version as production.

### 2.3 Browser tests

- The suite runs against the **production builds** (`vite preview` + `node dist/main.js`)
  started by Playwright (`playwright.config.ts`).
- Journeys covered: landing, login form, protected-route redirect, full study
  journey (register → deck → card → study → analytics) and WCAG 2.1 A/AA scans
  on public pages, authenticated screens and an open dialog.
- Traces are captured on first retry; retries are enabled on CI (2) and
  disabled locally (0).

## 3. Environments

| Environment | Web            | API                  | Database                                    |
| ----------- | -------------- | -------------------- | ------------------------------------------- |
| Local dev   | `vite` (5173)  | `nest start --watch` | Docker Compose PostgreSQL 17                |
| Local test  | `vite preview` | `node dist/main.js`  | `deckup` / `deckup_test`                    |
| CI          | `vite preview` | `node dist/main.js`  | GitHub Actions service `postgres:17-alpine` |

## 4. Test data

- Integration tests create their own accounts (`ana@example.com`,
  `beto@example.com`) and truncate all tables between tests.
- Browser journeys generate unique emails per run (`e2e-<timestamp>-<random>`),
  so they are repeatable against a shared database.
- No production data is ever used in tests; fixtures are synthetic.

## 5. Non-functional testing

| Attribute         | Approach                                                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Performance**   | Budget: web entry chunk ≤ 200 kB gzip, vendor chunk ≤ 100 kB gzip, API p95 < 300 ms. Recharts and the study screen are lazy-loaded; vendor chunks are split for cacheability.                                                                           |
| **Accessibility** | Automated WCAG 2.1 A/AA scans (`@axe-core/playwright`) on `/`, `/login`, `/register`, plus the dashboard, deck detail, analytics and an open dialog; serious/critical violations fail the build. Manual keyboard pass on study mode (`Space`, `1`–`4`). |
| **Security**      | Static scan of the repository (secrets, injection patterns), `pnpm audit --audit-level critical` in CI, Argon2id + rotating refresh tokens, rate limiting, RFC 9457 errors. See [`../04-operations/security.md`](../04-operations/security.md).         |
| **Reliability**   | Reviews are recorded in a single transaction; imports are all-or-nothing for valid rows.                                                                                                                                                                |

## 6. Entry and exit criteria

**Entry**: dependencies installed, database reachable, migrations applied.

**Exit (definition of done for a change)**

- [ ] `pnpm lint` and `pnpm typecheck` pass.
- [ ] `pnpm test` passes (unit).
- [ ] `pnpm --filter @deckup/api test:e2e` passes against PostgreSQL (integration).
- [ ] `pnpm build` succeeds.
- [ ] `pnpm test:e2e` passes (journeys + a11y) against the production builds.
- [ ] New requirements are traced in the traceability matrix.

## 7. Current status

| Suite                       | Files | Tests |
| --------------------------- | ----- | ----- |
| Shared contracts (unit)     | 3     | 8     |
| API (unit)                  | 19    | 110   |
| Web (unit/component)        | 11    | 38    |
| API integration (Supertest) | 11    | 66    |
| Browser E2E (Playwright)    | 3     | 8     |

## 8. Risks and mitigations

| Risk                                  | Mitigation                                                       |
| ------------------------------------- | ---------------------------------------------------------------- |
| Flaky browser tests                   | Retries on CI, trace artifacts, journeys limited to stable flows |
| Test DB drift from production schema  | Migrations applied by the same `prisma migrate deploy` command   |
| Time-dependent scheduling assertions  | Injected clock (`now` parameter) in domain and use cases         |
| Transitive dependency vulnerabilities | Audited in CI (critical) and documented as accepted risk         |

## 9. SWEBOK V4.0a references

- Cap. 5, §3 — _Test levels_: unit, integration, system.
- Cap. 5, §4 — _Test techniques_: white-box for domain rules, black-box for APIs.
- Cap. 5, §5.2 — _Test adequacy_: requirement coverage via the traceability matrix.
