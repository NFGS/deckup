# Platform Notes — DeckUp

| Field       | Value                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------- |
| **Version** | 1.0                                                                                                |
| **Date**    | 2026-10-04                                                                                         |
| **Status**  | Frozen — production infrastructure will not change further                                         |
| **Scope**   | Platform state, system requirements, run guide, user guide, maintenance                            |
| **Related** | [`deployment.md`](./deployment.md) · [`runbook.md`](./runbook.md) · [`security.md`](./security.md) |

> [!NOTE]
> **At a glance** — DeckUp production runs on **Vercel** (web), **Railway**
> (API) and **Neon** (PostgreSQL 17). The platform is intentionally **frozen**:
> no further infrastructure changes are planned. This page is the operational
> entry point for the team: current state, system requirements, how to run and
> use the app, and the standing recommendations if something breaks.

---

## 1. Production links

| Service     | URL                                            | Health check              |
| ----------- | ---------------------------------------------- | ------------------------- |
| **Web app** | <https://deckup.vercel.app>                    | `200` on `/`              |
| **API**     | <https://deckup-api-production.up.railway.app> | `200` on `/api/v1/health` |

The REST contract is documented in [`../02-architecture/openapi.yaml`](../02-architecture/openapi.yaml).

## 2. System requirements

### To use the app (end users)

| Requirement | Minimum                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| Browser     | Any modern browser (Chrome, Edge, Firefox or Safari, last 2 versions)      |
| Network     | Internet connection; the PWA keeps recently visited decks readable offline |
| Account     | Email plus a password of at least 10 characters                            |

### To run the project (team / developers)

| Requirement | Minimum | Notes                                                        |
| ----------- | ------- | ------------------------------------------------------------ |
| Node.js     | 22.x    | `node --version`                                             |
| pnpm        | 10.x    | `corepack enable`                                            |
| Docker      | 24+     | Only for the local PostgreSQL 17 (`docker compose up -d db`) |
| Disk        | ~2 GB   | Dependencies plus build artifacts                            |

Optional integrations degrade gracefully when unset: card images require a
Cloudinary account and AI card generation requires an OpenAI-compatible key;
without them the related endpoints answer `503` with problem details.

## 3. Run it locally

```bash
pnpm install
docker compose up -d db          # PostgreSQL 17 on :5432
pnpm dev                         # web on :5173 · API on :3000
```

Quality gates on every change:

```bash
pnpm lint && pnpm typecheck && pnpm test
docker compose up -d db && pnpm --filter @deckup/api test:e2e
pnpm build && pnpm test:e2e
```

Optional demo data: `pnpm --filter @deckup/api prisma:seed` creates
`demo@deckup.local` with a Biology deck and five cards (override with
`SEED_EMAIL` / `SEED_PASSWORD`).

## 4. Use the app

1. **Create an account** — register with an email, display name and a password
   (at least 10 characters).
2. **Create a deck** — title, subject, description, tags and visibility.
3. **Author cards** — front/back text; optionally an image, a hint, a
   difficulty level and tags; bulk-import from CSV with per-row validation.
4. **Study** — the daily queue shows the cards due today; rate each recall
   (Again / Hard / Good / Easy) and FSRS schedules the next review.
5. **Track progress** — streak, 30-day retention and the 7-day forecast live on
   the analytics page.
6. **Explore** — browse the public catalogue and clone useful decks
   (attribution is kept).

Study mode is keyboard-first: `Space` flips the card, `1`–`4` rate it.

## 5. Standing recommendations (frozen platform)

The platform stays exactly as it is today; these practices keep it healthy:

1. **Do not change infrastructure** — no provider migrations, no plan changes,
   no new services. The only accepted operational work is applying the data
   migrations shipped with code (`prisma migrate deploy` runs automatically as
   a pre-deploy step).
2. **Keep the routine checks** — daily `/health`, weekly Neon storage and
   connection review, monthly restore drill ([`runbook.md`](./runbook.md) §2).
3. **Deploy only through CI** — push to `main`, wait for the quality gates,
   and let the Deploy workflow publish. Never deploy by hand.
4. **Roll back by layer when needed** — promote the previous Vercel
   deployment, redeploy the previous Railway image, and remember that
   migrations are forward-only ([`deployment.md`](./deployment.md) §6).
5. **Guard the free tiers** — the scheduled health ping prevents idle
   suspension; if a free tier is exhausted, the same Docker image runs on any
   small VPS with Caddy ([`deployment.md`](./deployment.md) §7).

## 6. Accepted debt (known, no action planned)

| Item                                            | Note                                                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Railway `railway.json` deprecation (2026-12-01) | Revisit `.railway/railway.ts` only if Railway forces the migration; the current file works today                                 |
| `RAILWAY_TOKEN` secret absent                   | The API deploys through Railway's own GitHub integration; the CI deploy job for the API is skipped by design                     |
| Prisma 8 upgrade                                | Transitive advisories live in the Prisma CLI toolchain; upgrade only when Prisma 8 is stable ([`security.md`](./security.md) §3) |
| Error tracking (Sentry or similar)              | Structured logs plus `/health` are the current observability; a future step, not planned now                                     |

## 7. References

- [`deployment.md`](./deployment.md) — step-by-step deployment and rollback.
- [`runbook.md`](./runbook.md) — incident playbooks and routine checks.
- [`security.md`](./security.md) — controls, OWASP mapping and accepted risks.
- [`../STATUS.md`](../STATUS.md) — project state and continuation backlog.
