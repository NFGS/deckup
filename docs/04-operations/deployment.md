# Deployment Guide — DeckUp

| Field       | Value                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Version** | 1.0                                                                                                                             |
| **Date**    | 2026-09-22                                                                                                                      |
| **Related** | [`../02-architecture/adr/ADR-0007-deployment.md`](../02-architecture/adr/ADR-0007-deployment.md) · [`runbook.md`](./runbook.md) |

---

## 1. Environments

| Environment    | Web                             | API                             | Database                                   |
| -------------- | ------------------------------- | ------------------------------- | ------------------------------------------ |
| **Local**      | `pnpm --filter @deckup/web dev` | `pnpm --filter @deckup/api dev` | Docker Compose (`docker compose up -d db`) |
| **Production** | Vercel (CDN)                    | Railway (Docker image)          | Neon (PostgreSQL 17)                       |

## 2. Required environment variables

### API (Railway)

| Variable                 | Example                                        | Notes                                  |
| ------------------------ | ---------------------------------------------- | -------------------------------------- |
| `DATABASE_URL`           | `postgresql://user:pass@host/db?schema=public` | Neon pooled connection string          |
| `JWT_ACCESS_SECRET`      | 32+ random characters                          | Rotating it invalidates sessions       |
| `JWT_ACCESS_TTL_SECONDS` | `900`                                          | Access token lifetime                  |
| `REFRESH_TOKEN_TTL_DAYS` | `30`                                           | Refresh token lifetime                 |
| `COOKIE_SECURE`          | `true`                                         | Required in production                 |
| `CORS_ORIGINS`           | `https://deckup.vercel.app`                    | Comma-separated allow-list             |
| `PORT`                   | `3000`                                         | Railway injects it automatically       |
| `LLM_PROVIDER`           | `disabled` \| `openai`                         | Optional AI card generation            |
| `LLM_API_KEY`            | `sk-…`                                         | Required when the provider is `openai` |
| `LLM_MODEL`              | `gpt-4o-mini`                                  | Model used for suggestions             |
| `LLM_BASE_URL`           | `https://api.openai.com/v1`                    | Any OpenAI-compatible gateway          |

### Web (Vercel)

| Variable       | Example                                    |
| -------------- | ------------------------------------------ |
| `VITE_API_URL` | `https://deckup-api.up.railway.app/api/v1` |

> `VITE_*` variables are embedded at build time: changing one requires a redeploy.

## 3. First-time setup

1. **Database (Neon)** — create a PostgreSQL 17 project, copy the pooled
   connection string into Railway as `DATABASE_URL`.
2. **API (Railway)** — create a service from the GitHub repository with:
   - `RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile`
   - Root directory: repository root (the Dockerfile expects it as context).
   - Healthcheck path: `/api/v1/health`.
3. **Web (Vercel)** — import the repository, set **Root Directory** to
   `apps/web` (the committed `vercel.json` handles install, build and the SPA
   rewrite), and define `VITE_API_URL`.
4. **GitHub** — add the deployment secrets so the `Deploy` workflow can run:
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN`
   (and optionally the `RAILWAY_SERVICE` repository variable).
   The workflow skips a platform gracefully when its token is missing.

## 4. Release process

```bash
# 1. Quality gates on main
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm --filter @deckup/api test:e2e
pnpm test:e2e

# 2. Database migration (release step, before promoting the API)
pnpm --filter @deckup/api exec prisma migrate deploy

# 3. Deploy
#    - API:    Railway builds apps/api/Dockerfile and rolls out the container
#    - Web:    Vercel builds apps/web and promotes the deployment
```

The `Deploy` workflow automates steps 2–3 on every push to `main` (or manually
via `workflow_dispatch`). Migrations are **additive and immutable**: never edit
an applied migration (SPEC.md §4); destructive changes use expand/contract.

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
  per browser with a one-day expiration so decks stay readable offline.
- Reviews submitted while offline are queued in the browser and replayed when
  connectivity returns (see the study screen banner).
- `VITE_API_URL` is embedded at build time; changing it requires a redeploy.
