# Project Status — DeckUp

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| **Date**     | 2026-10-02                                                                  |
| **Version**  | 0.1.0 (untagged)                                                            |
| **HEAD**     | `88c29de docs: add a beginner-friendly deployment walkthrough` (2026-09-26) |
| **Snapshot** | Full repository review after a context handover                             |
| **Related**  | [`../PLAN.md`](../PLAN.md) · [`../SPEC.md`](../SPEC.md)                     |

This document is the **single source of truth for the current state of the
project** and for the continuation backlog. Read it together with `SPEC.md`
(stack and conventions) and `PLAN.md` (historical remediation plan).

---

## 1. Verified state (2026-10-02)

All five quality gates were executed from scratch (`--force`, no Turbo cache):

| Gate            | Command                                                                        | Result                                    |
| --------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| Lint            | `pnpm exec turbo run lint --force` + `eslint scripts e2e playwright.config.ts` | Pass (10/10 tasks)                        |
| Typecheck       | `pnpm exec turbo run typecheck --force` + `tsc --noEmit -p tsconfig.json`      | Pass                                      |
| Unit tests      | `pnpm exec turbo run test --force`                                             | **171/171** (shared 8 · API 120 · web 43) |
| API integration | `docker compose up -d db && pnpm --filter @deckup/api test:e2e`                | **72/72** against PostgreSQL 17           |
| Build           | `pnpm build`                                                                   | Pass                                      |
| Browser E2E     | `E2E_API_PORT=3100 pnpm exec playwright test`                                  | **8/8** (Playwright + axe-core)           |

> The browser E2E run required the local workaround described in §4.1 because
> this machine hosts another service on port 3000 and uses `*.env.local`
> overrides that Turbo's cache does not hash.

## 2. Scope delivered

| Area                       | Summary                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| API (`apps/api`)           | NestJS 12 + Fastify, Clean Architecture. 6 entities, 3 domain services, 17 ports, **31 use cases**, 10 controllers, 5 migrations. |
| Web (`apps/web`)           | React 19 + Vite 8 + Tailwind 4 + TanStack Query 5 + React Router 8. Feature-first; PWA with offline review queue.                 |
| Shared (`packages/shared`) | Zod 4 runtime contracts as the single source of truth.                                                                            |
| Documentation (`docs/`)    | 22 documents: user story refinement, traceability matrix, 8 MADR ADRs, data model, OpenAPI, test plan/cases, runbook, security.   |
| Delivery artefacts         | `DeckUp - User Story and Refinement - Nelson Fabián Gallego Sánchez.pdf` (2026-09-25); `deployment-walkthrough.md`.               |

Functional coverage: authentication, deck/card CRUD, images, CSV import/export,
FSRS study engine with idempotent offline replay, analytics, public catalogue
with cloning, AI card generation, accessibility (WCAG 2.1 AA scans).

## 3. Work timeline (reconstructed)

| Date                   | Milestone                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-09-21/22          | Monorepo bootstrap, requirements refinement, architecture, API, web, study engine, analytics (phases 0–8). |
| 2026-09-22 08:–12:     | Exhaustive review, remediation PLAN phases 1–5, Notion sync, deploy hardening.                             |
| 2026-09-25 19:20–19:24 | Hardening batch: refresh-token rotation, FSRS persistence, image signing, offline idempotency, docs.       |
| 2026-09-25 20:05       | Local overrides created (`apps/api/.env.local` PORT=3100, `apps/web/.env.local` VITE_API_URL=:3100).       |
| 2026-09-26 13:04       | `deployment-walkthrough.md` published — the deployment was the next intended step.                         |

## 4. Findings

### 4.1 P0 — Remote backup missing

`origin/main` points to `781bf3e "Initial commit"` with **no common ancestor**
with the local history, which is **68 commits ahead**. The full project exists
only on this machine. Publishing requires a force push (the remote initial
commit has no history to preserve).

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

1. **Production deployment** — walkthrough ready; no evidence of platform
   secrets being configured.
2. **Notion sync** — last sync 2026-09-22, older than the 2026-09-25/26 changes;
   `NOTION_TOKEN` / `NOTION_PAGE_ID` are not available in the environment.
3. **Account management UI** — `PATCH /users/me` exists in the API; the web app
   has no profile/settings screen (RF-01 scope).
4. **Academic evidence** — SENA formative evidence / general system report.

### 4.4 P2 — Minor debt

- `docker-compose.yml` local-only change pending commit (loopback binding).
- Web tests emit React `act()` warnings.
- Recharts forecast has no textual alternative for screen readers.
- `apps/web/public/icons.svg` is unreferenced.
- Fastify deprecation `FSTDEP024` (`requestIdLogLabel` → `logController`).
- No SemVer tag exists yet (`v0.1.0` proposed).
- `PLAN.md` header says "Completed" without reflecting the 2026-09-25/26 batch.

## 5. Continuation plan

| Phase | Goal                                                               | Status                        |
| ----- | ------------------------------------------------------------------ | ----------------------------- |
| 1     | Secure the work: commit pending files, publish `main`, verify CI   | Blocked — no push credentials |
| 2     | Permanent E2E fix, build-cache inputs, `v0.1.0` tag                | Done (2026-10-02)             |
| 3     | Production deployment (Neon → Railway → Vercel → GitHub secrets)   | Pending                       |
| 4     | Notion re-sync and documentation alignment (this file, PLAN, SPEC) | Pending                       |
| 5     | Account management UI and accessibility/tech-debt cleanup          | Pending                       |
| 6     | Academic evidence: SENA evidence pack / general system report      | Pending                       |

## 6. How to verify locally

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
docker compose up -d db && pnpm --filter @deckup/api test:e2e
pnpm build && E2E_API_PORT=3100 pnpm exec playwright test   # local port-conflict workaround
```
