# Deployment Guide — DeckUp

| Field       | Value                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Version** | 1.1                                                                                                                                                                                                                            |
| **Date**    | 2026-09-22                                                                                                                                                                                                                     |
| **Related** | [`../02-architecture/adr/ADR-0007-deployment.md`](../02-architecture/adr/ADR-0007-deployment.md) · [`runbook.md`](./runbook.md) · [`deployment-walkthrough.md`](./deployment-walkthrough.md) (beginner-friendly, step by step) |

---

## 1. Environments

| Environment    | Web                             | API                             | Database                                   |
| -------------- | ------------------------------- | ------------------------------- | ------------------------------------------ |
| **Local**      | `pnpm --filter @deckup/web dev` | `pnpm --filter @deckup/api dev` | Docker Compose (`docker compose up -d db`) |
| **Production** | Vercel (CDN)                    | Railway (Docker image)          | Neon (PostgreSQL 17)                       |

## 2. Required environment variables

### API (Railway)

| Variable                 | Example                                        | Notes                                                      |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`           | `postgresql://user:pass@host/db?schema=public` | Neon pooled connection string                              |
| `JWT_ACCESS_SECRET`      | 32+ random characters                          | Rotating it invalidates sessions                           |
| `JWT_ACCESS_TTL_SECONDS` | `900`                                          | Access token lifetime                                      |
| `REFRESH_TOKEN_TTL_DAYS` | `30`                                           | Refresh token lifetime                                     |
| `COOKIE_SECURE`          | `true`                                         | Required in production                                     |
| `CORS_ORIGINS`           | `https://deckup.vercel.app`                    | Comma-separated allow-list                                 |
| `PORT`                   | `3000`                                         | Railway injects it automatically                           |
| `APP_VERSION`            | `0.1.0`                                        | Reported by `/health`                                      |
| `IMAGE_STORAGE`          | `disabled` \| `cloudinary`                     | Card image uploads (RF-05)                                 |
| `CLOUDINARY_CLOUD_NAME`  | `deckup`                                       | Required when `IMAGE_STORAGE=cloudinary`                   |
| `CLOUDINARY_API_KEY`     | `1234567890`                                   | Required when `IMAGE_STORAGE=cloudinary`                   |
| `CLOUDINARY_API_SECRET`  | `…`                                            | Required when `IMAGE_STORAGE=cloudinary`                   |
| `CLOUDINARY_FOLDER`      | `deckup/cards`                                 | Optional asset folder                                      |
| `LLM_PROVIDER`           | `disabled` \| `openai`                         | Optional AI card generation                                |
| `LLM_API_KEY`            | `sk-…`                                         | Required when the provider is `openai`                     |
| `LLM_MODEL`              | `gpt-4o-mini`                                  | Model used for suggestions                                 |
| `LLM_BASE_URL`           | `https://api.openai.com/v1`                    | Any OpenAI-compatible gateway                              |
| `LOG_LEVEL`              | `info`                                         | Fastify structured logger level                            |
| `TRUST_PROXY`            | `1` behind Railway                             | Trusted reverse-proxy hops; `false` by default             |
| `CLOUDINARY_URL`         | `cloudinary://key:secret@cloud`                | Alternative to the three `CLOUDINARY_*` variables          |
| `SEED_EMAIL`             | `demo@deckup.local`                            | Optional demo account email                                |
| `SEED_PASSWORD`          | 12+ random characters                          | Required (with `SEED_ALLOW_PRODUCTION`) to seed production |

Boot validation fails fast when a feature is enabled without its credentials.

### Web (Vercel)

| Variable       | Example                                    |
| -------------- | ------------------------------------------ |
| `VITE_API_URL` | `https://deckup-api.up.railway.app/api/v1` |

> `VITE_*` variables are embedded at build time: changing one requires a redeploy.

## 3. First-time setup

1. **Database (Neon)** — create a PostgreSQL 17 project, copy the pooled
   connection string into Railway as `DATABASE_URL`.
2. **API (Railway)** — create a service from the GitHub repository. The
   committed [`railway.json`](../../railway.json) points the build at
   `apps/api/Dockerfile` and sets the health check to `/api/v1/health`.
3. **Web (Vercel)** — import the repository, set **Root Directory** to
   `apps/web` (the committed `vercel.json` handles install, builds the
   workspace dependencies with Turbo and applies the SPA rewrite), and define
   `VITE_API_URL`.
4. **GitHub** — add the deployment secrets so the `Deploy` workflow can run:
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN` and
   `DATABASE_URL` (used for the release migration). Optionally set the
   `RAILWAY_SERVICE` repository variable. The workflow skips a platform
   gracefully when its token is missing.

### Demo data (optional)

```bash
pnpm --filter @deckup/api prisma:seed
```

Creates `demo@deckup.local` (password `deckup-demo-1`, override with
`SEED_EMAIL`/`SEED_PASSWORD`) with a Biology deck and five cards.

The script refuses to run against a production database unless both
`SEED_PASSWORD` and `SEED_ALLOW_PRODUCTION=true` are set, and it never prints the
password.

## 4. Release process

```bash
# 1. Quality gates on main
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @deckup/api test:e2e
pnpm build && pnpm test:e2e
```

The `Deploy` workflow listens for the CI workflow to complete on `main` and
only runs when it succeeded (or on a manual `workflow_dispatch`). It then:

1. **Migrates** — `prisma migrate deploy` against `secrets.DATABASE_URL`
   (additive and immutable migrations; SPEC.md §4).
2. **Deploys the API** — `railway up` builds `apps/api/Dockerfile` and rolls
   out the container.
3. **Deploys the web** — Vercel builds and promotes the deployment.

### Docker (portable artifact)

```bash
docker build -f apps/api/Dockerfile -t deckup-api .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" \
  -e JWT_ACCESS_SECRET="<32+ chars>" \
  -e COOKIE_SECURE=true \
  -e CORS_ORIGINS="https://deckup.vercel.app" \
  deckup-api
```

## 5. Verification after a deployment

1. `GET /api/v1/health` returns `200` with the expected version.
2. Register a throwaway account, create a deck, add a card, run a study session.
3. `GET /api/v1/analytics/overview` reflects the review just made.
4. The web app loads, the session survives a reload (silent refresh) and
   `Sign out` clears the cookie.
5. Railway logs show no error-level entries during the smoke test.

## 6. Rollback

| Layer        | Procedure                                                                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web**      | Vercel → Deployments → _Promote_ the previous successful deployment.                                                                                                                                  |
| **API**      | Railway → Deployments → _Redeploy_ the previous image.                                                                                                                                                |
| **Database** | Migrations are forward-only; if a release must be undone, ship a new migration that reverts the change. Neon point-in-time restore is the last resort (see [`backup-policy.md`](./backup-policy.md)). |

## 7. Cost and limits (free tiers)

- Vercel Hobby, Railway trial credits and Neon free tier cover the expected
  academic load. A scheduled health ping prevents idle suspension; if the free
  tier is exhausted, the same Docker image runs on any VPS with Caddy.

## 8. Web client specifics

- The web app ships as an installable PWA (`vite-plugin-pwa`): the app shell is
  precached and authenticated GETs (`/api/v1/*`, excluding `/auth/*`) are cached
  per browser with a one-day expiration, so recently visited decks stay readable
  while offline.
- A full offline reload still requires a network round-trip to restore the
  session (`/auth/refresh` is never cached); the service worker cache is purged
  on sign-out to avoid leaking data between accounts on a shared device.
- Reviews graded offline are queued in the browser with an idempotency key and
  replayed when connectivity returns while a study screen is open (or on the
  next visit), even if the response to the original request was lost.
- `VITE_API_URL` is embedded at build time; changing it requires a redeploy.
