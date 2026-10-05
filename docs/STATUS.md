# Project Status — DeckUp

| Field          | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| **Date**       | 2026-10-04                                                                              |
| **Version**    | 0.1.0 (tagged, published and deployed)                                                  |
| **HEAD**       | `61accae docs(operations): record frozen platform state and run/use guide` (2026-10-04) |
| **Production** | Web <https://deckup.vercel.app> · API <https://deckup-api-production.up.railway.app>    |
| **Snapshot**   | Documentation refresh, Archify diagrams and a manifest-driven four-environment sync     |
| **Related**    | [`../PLAN.md`](../PLAN.md) · [`../SPEC.md`](../SPEC.md)                                 |

> [!NOTE]
> **At a glance** — v0.1.0 is tagged, published and deployed. All five quality gates are
> green (174 unit · 72 API integration · 8 browser E2E), production is verified end-to-end
> and the only open item is the Railway redeploy token for the CI deploy job.

This document is the **single source of truth for the current state of the
project** and for the continuation backlog. Read it together with `SPEC.md`
(stack and conventions) and `PLAN.md` (historical remediation plan).

---

## 1. Verified state (2026-10-02)

All five quality gates were executed from scratch (`--force`, no Turbo cache):

| Gate               | Command                                                                        | Result                                                           |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Lint               | `pnpm exec turbo run lint --force` + `eslint scripts e2e playwright.config.ts` | Pass (10/10 tasks)                                               |
| Typecheck          | `pnpm exec turbo run typecheck --force` + `tsc --noEmit -p tsconfig.json`      | Pass                                                             |
| Unit tests         | `pnpm exec turbo run test --force`                                             | **174/174** (shared 8 · API 120 · web 46)                        |
| API integration    | `docker compose up -d db && pnpm --filter @deckup/api test:e2e`                | **72/72** against PostgreSQL 17                                  |
| Build              | `pnpm build`                                                                   | Pass                                                             |
| Browser E2E        | `E2E_API_PORT=3100 pnpm exec playwright test`                                  | **8/8** (Playwright + axe-core)                                  |
| Production image   | `docker build -f apps/api/Dockerfile -t deckup-api:verification .` + run       | **200** on `/api/v1/health` (v0.1.0)                             |
| Documentation sync | `pnpm sync:all`                                                                | **23 documents** on Notion + Obsidian, incremental (2026-10-05)  |
| CI (GitHub)        | `gh run view 37113194127`                                                      | **success** — quality, API e2e, browser e2e                      |
| Neon migrations    | `prisma migrate deploy` (direct URL)                                           | 5/5 applied (2026-10-03)                                         |
| Vercel project     | API PATCH project settings                                                     | `rootDirectory=apps/web`, `sourceFilesOutsideRootDirectory=true` |
| Production web     | `curl https://deckup.vercel.app`                                               | **200** (Vercel)                                                 |
| Production API     | `curl .../api/v1/health`                                                       | **200** `{"status":"ok","version":"0.1.0"}`                      |
| Production smoke   | `E2E_BASE_URL=https://deckup.vercel.app playwright test e2e/smoke.spec.ts`     | **3/3** (read-only)                                              |
| Production flow    | API end-to-end: register → deck → card → study → review → analytics            | **OK** (2026-10-03)                                              |
| Railway autodeploy | Push `3582662` → deployment `d64e141b` (trigger `f2be2d99`)                    | **SUCCESS** — pre-deploy applied 5 migrations                    |
| Fresh clone        | `git clone` → `pnpm install --frozen-lockfile` → all gates                     | **OK** — 174 unit · 72 API e2e · 8 browser e2e                   |

> [!NOTE]
> The browser E2E run required the local workaround described in §4.1 because
> this machine hosts another service on port 3000 and uses `*.env.local`
> overrides that Turbo's cache does not hash.

## 2. Scope delivered

| Area                       | Summary                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API (`apps/api`)           | NestJS 12 + Fastify, Clean Architecture. 6 entities, 3 domain services, 17 ports, **31 use cases**, 10 controllers, 5 migrations.                                              |
| Web (`apps/web`)           | React 19 + Vite 8 + Tailwind 4 + TanStack Query 5 + React Router 8. Feature-first; PWA with offline review queue.                                                              |
| Shared (`packages/shared`) | Zod 4 runtime contracts as the single source of truth.                                                                                                                         |
| Documentation (`docs/`)    | 26 documents: user story refinement, traceability matrix, 8 MADR ADRs, data model, OpenAPI, test plan/cases, runbook, security, platform notes, SENA report and class diagram. |
| Delivery artefacts         | `DeckUp - User Story and Refinement - Nelson Fabián Gallego Sánchez.pdf` (2026-09-25); `deployment-walkthrough.md`.                                                            |

Functional coverage: authentication, deck/card CRUD, images, CSV import/export,
FSRS study engine with idempotent offline replay, analytics, public catalogue
with cloning, AI card generation, accessibility (WCAG 2.1 AA scans).

## 3. Work timeline (reconstructed)

| Date                   | Milestone                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-21/22          | Monorepo bootstrap, requirements refinement, architecture, API, web, study engine, analytics (phases 0–8).                             |
| 2026-09-22 08:–12:     | Exhaustive review, remediation PLAN phases 1–5, Notion sync, deploy hardening.                                                         |
| 2026-09-25 19:20–19:24 | Hardening batch: refresh-token rotation, FSRS persistence, image signing, offline idempotency, docs.                                   |
| 2026-09-25 20:05       | Local overrides created (`apps/api/.env.local` PORT=3100, `apps/web/.env.local` VITE_API_URL=:3100).                                   |
| 2026-09-26 13:04       | `deployment-walkthrough.md` published — the deployment was the next intended step.                                                     |
| 2026-10-04             | Documentation refresh (Archify diagrams, Open Design cover) and a manifest-driven sync across repository, GitHub, Notion and Obsidian. |

## 4. Findings

### 4.1 P0 — Remote backup (resolved 2026-10-03)

`main` was published to `origin` (force-with-lease over the unrelated
"Initial commit") together with the `v0.1.0` tag. The first real CI run exposed
a latent failure — the API lint needed the generated Prisma client, which is
gitignored — fixed in `2c07b3b`. All three CI jobs are green.

### 4.2 P0 — Browser E2E fails on this machine (diagnosed, worked around)

- `kubo-gateway` (another local project) listens on port 3000 and answers
  `200` on `/api/v1/health`; Playwright's `reuseExistingServer` mistakes it for
  the DeckUp API and never starts the real one.
- Local overrides move the API to 3100, but Turbo does not hash `.env.local`,
  so a stale web bundle (pointing at :3000) was replayed from cache.
- Verified workaround: rebuild forced (`turbo run build --filter=@deckup/web
--force`) and run `E2E_API_PORT=3100` → 8/8 green.
- **Fixed (2026-10-02)**: the API web server never reuses an existing listener
  (`reuseExistingServer: false`), Turbo now hashes `.env.local` as a build
  input, and the README documents `E2E_API_PORT`. Re-verified 8/8.

### 4.3 P1 — Pending continuation work

1. **Production deployment** — **done (2026-10-03)**: Neon migrated, API on
   Railway, web on Vercel, `VITE_API_URL` wired, CORS verified and smoke test
   green. Railway deploys the API from GitHub on every push to `main` and runs
   `prisma migrate deploy` as a pre-deploy command; the Deploy workflow only
   publishes the web app.
2. **Documentation sync** — **done (2026-10-05)**: 23 documents (15 documents +
   8 ADRs) published with rich blocks to Notion and mirrored to the Obsidian
   vault. A `.sync-manifest.json` (SHA-256 per document and target) makes the
   sync incremental and drift detectable in any direction; `pnpm sync:all`,
   `sync:check`, `sync:watch`, the husky hooks and the `Docs sync` workflow keep
   the repository, GitHub, Notion and Obsidian aligned (`3ee7d55f-d95e-8079-8ee8-f9dc00042699`).
3. **Account management UI** — **done (2026-10-02)**: `/account` page with
   display name and IANA timezone, wired to `PATCH /users/me`, covered by unit
   tests and an authenticated axe scan.
4. **Academic evidence** — **done (2026-10-02)**: general system report at
   [`05-academic/informe-general-sistema.md`](./05-academic/informe-general-sistema.md)
   with the class diagram and 12 screenshots in `05-academic/evidencias/`.

### 4.5 Production bugs found and fixed (2026-10-03)

The first end-to-end verification against production exposed three defects that
local tests could not catch:

1. **Inconsistent deck listing** — `$transaction([findMany, count])` through the
   Neon pooler returned `total > 0` with an empty `items` array. Replaced with
   `Promise.all` (`ab883f0`).
2. **Stale cached responses** — without `Cache-Control`, Chrome heuristically
   cached `GET /decks` and served the old list after a mutation. The API now
   sends `cache-control: no-store` on every response (`74f7b9c`).
3. **Session lost on reload** — the refresh cookie used `SameSite=Lax`, which
   browsers do not send on cross-site requests (Vercel web ↔ Railway API). It is
   now `SameSite=None` when `COOKIE_SECURE=true` (`74f7b9c`).

Verified in production: register → deck visible right after creation → reload
keeps the session → card → study session → review → summary → analytics
(streak 1, retention 100%).

### 4.4 P2 — Minor debt

- **Resolved (2026-10-04)**: Railway's Config-as-Code deprecation was addressed
  ahead of the 2026-12-01 deadline. The service is now managed by
  Infrastructure as Code (`.railway/railway.ts`, partial `deckup-api`) and the
  deprecated `railway.json` was removed. `railway config plan` reports the
  configuration as up to date; the Dockerfile build, pre-deploy migration and
  healthcheck are preserved. See
  [`04-operations/platform-notes.md`](./04-operations/platform-notes.md) §6.

## 5. Continuation plan

| Phase | Goal                                                               | Status                                              |
| ----- | ------------------------------------------------------------------ | --------------------------------------------------- |
| 1     | Secure the work: commit pending files, publish `main`, verify CI   | Done (2026-10-03) — CI green                        |
| 2     | Permanent E2E fix, build-cache inputs, `v0.1.0` tag                | Done (2026-10-02)                                   |
| 3     | Production deployment (Neon → Railway → Vercel → GitHub secrets)   | Done (2026-10-03) — Railway autodeploys from GitHub |
| 4     | Notion re-sync and documentation alignment (this file, PLAN, SPEC) | Done (2026-10-03) — 10 pages published              |
| 5     | Account management UI and accessibility/tech-debt cleanup          | Account UI done; minor debt pending                 |
| 6     | Academic evidence: SENA evidence pack / general system report      | Done (report, class diagram, 12 screenshots)        |
| 7     | Platform freeze: operational notes, run/use guide, accepted debt   | Done (2026-10-04) — `platform-notes.md` published   |

## 6. How to verify locally

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
docker compose up -d db && pnpm --filter @deckup/api test:e2e
pnpm build && E2E_API_PORT=3100 pnpm exec playwright test   # local port-conflict workaround
docker build -f apps/api/Dockerfile -t deckup-api:verification .   # production image
```
