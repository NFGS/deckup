# Deployment Walkthrough — From Zero to Production

| Field        | Value                                                             |
| ------------ | ----------------------------------------------------------------- |
| **Version**  | 1.0                                                               |
| **Audience** | Beginners: no prior cloud experience required                     |
| **Related**  | [`deployment.md`](./deployment.md) · [`runbook.md`](./runbook.md) |

This guide takes DeckUp from the local repository to a public URL you can show
to anyone. Every step explains **what** you are doing and **why**, with the
exact commands and where to click.

---

## 0. Concepts in plain language

| Term                            | Meaning                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| **Repository (repo)**           | The project's folder with its full history, hosted on GitHub.          |
| **Commit / push**               | A saved change / uploading your commits to GitHub.                     |
| **CI (Continuous Integration)** | Robots that run the tests on every push. Here: GitHub Actions.         |
| **CD (Continuous Deployment)**  | Robots that publish the app after the tests pass.                      |
| **Environment variable**        | A configuration value (password, URL) kept outside the code.           |
| **Migration**                   | A versioned SQL change that updates the database structure.            |
| **Health check**                | A URL (`/api/v1/health`) that says "I am alive".                       |
| **Monorepo**                    | One repo with several apps: `apps/web`, `apps/api`, `packages/shared`. |

DeckUp in production uses three free services:

```
Student's browser
      │
      ▼
Vercel  ──►  web app (React, static files + PWA)
      │  HTTPS API calls
      ▼
Railway ──►  API (NestJS in Docker)  ──►  Neon (PostgreSQL 17)
```

---

## 1. Before you start

Accounts (all have a free tier): **GitHub**, **Neon**, **Railway**, **Vercel**.

Tools on your computer:

```bash
git --version        # any recent version
node --version       # must print v22.x or newer
pnpm --version       # must print 10.x or newer
```

Confirm the project is healthy locally before deploying:

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
docker compose up -d db
pnpm --filter @deckup/api test:e2e
pnpm build && pnpm test:e2e
```

All five must pass. If they do, the same code will pass in CI.

---

## 2. Step 1 — Put the code on GitHub

1. On GitHub: **New repository** → name `deckup` → **Private** → do **not**
   add a README (the project already has one).
2. Connect your local folder and push:

```bash
git remote add origin https://github.com/<your-user>/deckup.git
git push -u origin main
```

3. Open the repository → **Actions** tab. The `CI` workflow starts:
   - `quality` — lint, typecheck, unit tests, build.
   - `api-e2e` — API tests against a real PostgreSQL.
   - `e2e` — Playwright browser tests (downloads the report as an artifact).

Green checks mean the code is trustworthy. The `Deploy` workflow appears too,
but it **skips** the platforms until you add their secrets (next steps).

> If `quality` fails on `pnpm audit`, a dependency published a critical
> advisory: update it with `pnpm up <package>` and push again.

---

## 3. Step 2 — Create the database (Neon)

1. Sign in to <https://neon.tech> → **New Project** → PostgreSQL **17** →
   name it `deckup`.
2. Copy **two** connection strings from the dashboard:
   - **Pooled** (has `-pooler` in the host): used by the API at runtime.
   - **Direct** (no `-pooler`): used to apply migrations, because DDL through
     a connection pooler can fail.
     Both look like:
     `postgresql://user:password@host/dbname?sslmode=require`

Keep them private. You will paste them in Railway and GitHub.

---

## 4. Step 3 — Deploy the API (Railway)

1. Sign in to <https://railway.app> with GitHub → **New Project** →
   **Deploy from GitHub repo** → pick `deckup`.
2. Railway reads [`railway.json`](../../railway.json) and builds
   `apps/api/Dockerfile` automatically. The health check is
   `/api/v1/health`.
3. Open the service → **Variables** → add:

| Variable            | Value                                                                |
| ------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`      | the **pooled** Neon string                                           |
| `JWT_ACCESS_SECRET` | 32+ random characters (e.g. `openssl rand -hex 32`)                  |
| `COOKIE_SECURE`     | `true`                                                               |
| `CORS_ORIGINS`      | `https://<your-app>.vercel.app` (fill it after Step 4)               |
| `TRUST_PROXY`       | `1` (Railway sits in front of the container)                         |
| `APP_VERSION`       | `0.1.0`                                                              |
| `IMAGE_STORAGE`     | `disabled`, or `cloudinary` + credentials                            |
| `CLOUDINARY_URL`    | `cloudinary://key:secret@cloud` (alternative to the three variables) |
| `LLM_PROVIDER`      | `disabled`, or `openai` + `LLM_API_KEY`                              |

4. **Settings → Networking → Generate Domain**. Copy the URL, e.g.
   `https://deckup-api-production.up.railway.app`.
5. Test it: open `https://<railway-domain>/api/v1/health` in the browser. You
   must see `{"status":"ok", ...}`.

> The API refuses to start in production with the example JWT secret,
> `COOKIE_SECURE=false` or a `localhost` CORS origin. That is intentional:
> insecure deployments fail immediately instead of leaking data.

---

## 5. Step 4 — Deploy the web app (Vercel)

1. Sign in to <https://vercel.com> with GitHub → **Add New → Project** →
   import `deckup`.
2. Configure:
   - **Root Directory**: `apps/web`
   - **Include source files outside of the Root Directory**: enabled
     (needed for the monorepo's shared package).
   - **Environment Variables**: `VITE_API_URL` =
     `https://<railway-domain>/api/v1` (note the `/api/v1` suffix).
3. **Deploy**. Vercel runs the `vercel.json` commands, which build
   `@deckup/shared` and `@deckup/web` with Turbo. Copy the final URL, e.g.
   `https://deckup.vercel.app`.
4. Go back to Railway and set `CORS_ORIGINS` to that exact URL (no trailing
   slash). Railway redeploys automatically.

`VITE_API_URL` is embedded at build time: if you change it, redeploy the web
app (**Deployments → Redeploy**).

---

## 6. Step 5 — Let GitHub deploy for you

The `Deploy` workflow runs when `CI` finishes green on `main`. Give it the
credentials:

1. Repository → **Settings → Secrets and variables → Actions**.
2. **Secrets** (encrypted):

| Secret              | Where to get it                                    |
| ------------------- | -------------------------------------------------- |
| `VERCEL_TOKEN`      | Vercel → Account Settings → Tokens → Create        |
| `VERCEL_ORG_ID`     | Vercel → Team/Account Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General → Project ID |

3. Trigger a release: **Actions → Deploy → Run workflow** (or push any commit
   to `main`). It builds and promotes the web app on Vercel.

The API deploys itself: connect the repository in Railway (service →
**Settings → Source → Connect Repo**, branch `main`). Railway builds
`apps/api/Dockerfile` on every push and runs `prisma migrate deploy` as a
pre-deploy command, so the database is migrated before the new container starts.

> Without the Vercel secrets the workflow prints a friendly skip message;
> nothing breaks.

---

## 7. Step 6 — Verify the production system

1. `https://<railway-domain>/api/v1/health` → `200` with the version.
2. Open the Vercel URL and walk the real flow:
   register → create a deck → add a card → study → check analytics.
3. Reload the page: the session must survive (silent token refresh).
4. Press **Sign out**: the cookie is cleared and the caches are purged.
5. Optional automated smoke (read-only tests, safe against production):

```bash
E2E_BASE_URL=https://<your-app>.vercel.app \
  pnpm exec playwright test e2e/smoke.spec.ts
```

Do **not** run `study-journey.spec.ts` against production: it creates real
users and decks.

---

## 8. Optional — demo data in production

Only if you want a ready-made account for a presentation:

```bash
DATABASE_URL="<neon-direct-url>" \
SEED_PASSWORD="<a strong password>" \
SEED_ALLOW_PRODUCTION=true \
NODE_ENV=production \
pnpm --filter @deckup/api prisma:seed
```

The script refuses to run in production without both `SEED_PASSWORD` and
`SEED_ALLOW_PRODUCTION=true`, and it never prints the password.

---

## 9. Day-2 operations

| Task                     | How                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Logs**                 | Railway → service → Logs (API); Vercel → Deployment → Functions/Runtime logs (web).                                        |
| **Rollback web**         | Vercel → Deployments → previous one → **Promote to Production**.                                                           |
| **Rollback API**         | Railway → Deployments → previous image → **Redeploy**.                                                                     |
| **Rollback database**    | Migrations are forward-only: write a new migration that reverts the change; Neon point-in-time restore is the last resort. |
| **New release**          | Push to `main`; CI runs, then Deploy migrates and publishes.                                                               |
| **Change configuration** | Edit the variable in Railway/Vercel; the platform redeploys.                                                               |

Full incident playbooks: [`runbook.md`](./runbook.md).

---

## 10. Troubleshooting

| Symptom                                                      | Likely cause                                               | Fix                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------- |
| API crashes on boot with `Invalid environment configuration` | A required variable is missing or insecure                 | Read the message; it names the variable.                 |
| Web shows "We could not load your decks"                     | `VITE_API_URL` wrong or API down                           | Check `/health`; fix the variable and redeploy.          |
| API answers `CORS` errors in the browser console             | `CORS_ORIGINS` does not match the web URL                  | Set the exact origin, no trailing slash.                 |
| Login works but the session drops on reload                  | `COOKIE_SECURE=true` without HTTPS, or cookies blocked     | Always use the HTTPS URLs.                               |
| Images return `503`                                          | `IMAGE_STORAGE=disabled` or missing Cloudinary credentials | Configure the provider or accept the graceful fallback.  |
| `prisma migrate deploy` fails through Neon                   | Using the pooled string for DDL                            | Use the **direct** string for the `DATABASE_URL` secret. |
| Vercel build cannot find `@deckup/shared`                    | "Include files outside the Root Directory" disabled        | Enable it and redeploy.                                  |
| CI is red on a dependency advisory                           | New critical CVE                                           | `pnpm up <package>`, run the gates, push.                |

---

## 11. Ten-minute SENA demo script

1. **Architecture (1 min)** — show the diagram in
   [`../02-architecture/overview.md`](../02-architecture/overview.md):
   browser → Vercel → Railway → Neon, and the Clean Architecture layers.
2. **Quality (1 min)** — GitHub → Actions: three green jobs; mention 171 unit
   tests, 72 API integration tests and 8 browser tests with accessibility
   scans.
3. **Live product (5 min)** — register a student, create a deck, add a card
   with an image, import a CSV with one duplicated row, study with the
   keyboard (`Space`, `1`–`4`), finish the session and show the analytics
   (streak, retention, forecast).
4. **Offline (1 min)** — DevTools → Network → Offline, grade a card, go back
   online and show the "pending reviews" banner syncing.
5. **Delivery (1 min)** — push a small commit, watch CI run and the Deploy
   workflow migrate and publish; show the rollback button in Vercel.
6. **Security (1 min)** — mention: hashed passwords (Argon2id), rotating
   refresh tokens with reuse detection, rate limiting, private card images
   with signed URLs, no secrets in the repository.
