# Runbook — DeckUp

| Field       | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| **Version** | 1.0                                                                 |
| **Date**    | 2026-09-22                                                          |
| **Related** | [`deployment.md`](./deployment.md) · [`security.md`](./security.md) |

> [!NOTE]
> **At a glance** — 5 incident playbooks (API unhealthy, database unreachable, failed
> migration, auth spike, slow study sessions) plus routine checks and common tasks. Escalation
> captures the failing request, timestamp, correlation id and affected account.

Operational procedures for the DeckUp API and web client.

---

## 1. Service overview

| Component | Platform | Health signal                | Logs                         |
| --------- | -------- | ---------------------------- | ---------------------------- |
| API       | Railway  | `GET /api/v1/health` → `200` | Railway → service → _Logs_   |
| Web       | Vercel   | HTTP `200` on `/`            | Vercel → deployment → _Logs_ |
| Database  | Neon     | Neon console → _Monitoring_  | Neon → _Operations_          |

## 2. Routine checks

| Frequency | Check                                                                           |
| --------- | ------------------------------------------------------------------------------- |
| Daily     | `/health` responds; no error-level API logs in the last 24 h                    |
| Weekly    | Neon storage and connection count within the free tier                          |
| Monthly   | Restore drill from a Neon branch (see [`backup-policy.md`](./backup-policy.md)) |

## 3. Incident playbooks

### 3.1 API unhealthy (`/health` fails)

1. Check Railway deployment status and recent logs (`Nest` bootstrap errors).
2. If the logs show `Invalid environment configuration`, a required variable is
   missing or malformed — compare against [`deployment.md`](./deployment.md) §2.
3. If the logs show `Connected to the database` followed by connection errors,
   treat it as a database incident (§3.2).
4. Roll back to the previous Railway deployment while investigating.

### 3.2 Database unreachable

1. Neon console → _Monitoring_: confirm the compute is active (it may have
   scaled to zero; the first request wakes it).
2. Verify `DATABASE_URL` still points at the pooled endpoint and that the
   password was not rotated.
3. If the branch is damaged, create a branch from the last good timestamp and
   repoint `DATABASE_URL` (see [`backup-policy.md`](./backup-policy.md)).

### 3.3 Migration failed during a release

1. The API is not promoted until `prisma migrate deploy` succeeds; the previous
   version keeps serving.
2. Read the failing SQL in the Railway logs, fix the migration **in a new
   migration** (never edit an applied one) and redeploy.
3. If the database is left in an inconsistent state, restore the pre-release
   branch in Neon and redeploy the previous API image.

### 3.4 Authentication failures spike

1. Check whether `JWT_ACCESS_SECRET` or `REFRESH_TOKEN_TTL_DAYS` changed: a new
   secret invalidates every session by design.
2. Confirm the web origin is listed in `CORS_ORIGINS` (a mismatch shows up as
   browser-level CORS errors, not API errors).
3. Inspect `401`/`429` rates in the API logs; a `429` spike means the throttler
   is protecting `/auth/*` as designed.

### 3.5 Slow study sessions

1. Check the API p95 latency in the Railway metrics.
2. The daily queue relies on the `review_states(user_id, due_at)` index; a
   regression usually means a query change (inspect the Prisma query).
3. As a mitigation, reduce the queue limit in `GetStudyQueueUseCase`
   (`QUEUE_LIMIT`).

## 4. Common tasks

| Task                           | Procedure                                                                  |
| ------------------------------ | -------------------------------------------------------------------------- |
| Rotate the JWT secret          | Update `JWT_ACCESS_SECRET` in Railway, redeploy; all users re-authenticate |
| Add a CORS origin              | Update `CORS_ORIGINS` (comma-separated), redeploy the API                  |
| Inspect the database           | `pnpm --filter @deckup/api prisma:studio` against a Neon branch            |
| Re-run the quality gates       | `pnpm lint && pnpm typecheck && pnpm test && pnpm build`                   |
| Reproduce a user issue locally | `docker compose up -d db && pnpm dev`, then use the same payloads          |

## 5. Escalation

DeckUp is maintained by a single developer (academic project). If an incident
cannot be resolved with the playbooks above, capture: the failing request,
timestamp, correlation from API logs, and the affected account email (never
passwords or tokens), then open an issue in the repository.
