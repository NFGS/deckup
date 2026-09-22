# ADR 0007: Deployment on Vercel, Railway and Neon

**Date**: 2026-09-22
**Status**: Accepted
**Authors**: Fabián Gallego

## Context

The project must be publicly deployed with continuous delivery, near-zero operational
budget and enough observability to debug production issues. The stack is a static SPA
(web), a long-lived Node.js API (NestJS + Fastify) and PostgreSQL 17. Traffic is low and
bursty (evenings, exam weeks); cold starts are acceptable except during active study
sessions.

Local development already runs on Docker Compose with PostgreSQL 17, and CI runs on
GitHub Actions.

## Decision

Deploy each container to a managed platform, all driven from GitHub:

| Artifact     | Platform    | Notes                                                        |
| ------------ | ----------- | ------------------------------------------------------------ |
| **Web SPA**  | **Vercel**  | Static build from `apps/web`, global CDN, preview per PR     |
| **API**      | **Railway** | Docker image from `apps/api`, health check `/api/v1/health`  |
| **Database** | **Neon**    | Serverless PostgreSQL 17, branching for preview environments |

- Secrets live in each platform's environment settings; `.env` files are never committed.
- `prisma migrate deploy` runs as a release step before the API container is promoted.
- Rollback strategy: Vercel instant rollback; Railway redeploy of the previous image;
  Neon point-in-time restore.

## Alternatives considered

1. **Single VPS with Docker Compose + Caddy**
   - Pros: full control, flat cost, one place for everything, closest to production-like
     operations practice.
   - Contras: manual TLS, backups, monitoring and OS patching; single point of failure;
     the operator (a student) becomes the on-call engineer.
2. **Fly.io for the API**
   - Pros: excellent cold-start behaviour, global regions, Docker-native.
   - Contras: two providers to operate for marginal benefit; more CLI-oriented workflow.
3. **Render**
   - Pros: simple Heroku-like experience, managed PostgreSQL in the same dashboard.
   - Contras: free instance spin-down causes cold starts of ~30 s, which would be visible
     during study sessions; Railway's always-on trial tier fits better.
4. **AWS (ECS + RDS + S3/CloudFront)**
   - Pros: maximum control and enterprise realism.
   - Contras: cost and operational complexity far beyond the project's needs.

## Trade-offs and justification

| Criterion            | Vercel+Railway+Neon | Single VPS | Fly.io | Render  |
| -------------------- | ------------------- | ---------- | ------ | ------- |
| Setup time           | ✅ minutes          | ⚠️ hours   | ✅     | ✅      |
| Ops burden           | ✅ none             | ❌ high    | ✅     | ✅      |
| Cold starts          | ⚠️ Railway tier     | ✅         | ✅     | ❌ 30 s |
| Cost (free tier)     | ✅                  | ⚠️ VPS fee | ✅     | ✅      |
| Learning value (ops) | ⚠️ managed          | ✅ high    | ✅     | ⚠️      |

The decisive criteria are delivery speed and zero maintenance. The single-VPS alternative
remains documented as a fallback (and as an optional exercise) but is not the default
because it converts every deployment into an infrastructure task. The API is containerized
from day one, so migration to any Docker-capable host is a configuration change.

## Consequences

- **Positive**: push-to-deploy with preview environments; managed TLS, DNS and backups;
  independent scaling of web and API; free tier covers the expected load.
- **Negative / risks**: three vendor dashboards; region alignment between Railway and Neon
  must be configured to keep latency low; free tiers can sleep (mitigated by a scheduled
  health ping); vendor lock-in is limited to configuration, not code.
- **Required actions**: document environment variables per platform; add the release
  migration step; configure Neon connection pooling (`pgbouncer`) for serverless-friendly
  connections; keep the Docker image as the portable artifact.

## References SWEBOK

- Cap. 6, §2.1 — Operations: deployment and environment management.
- Cap. 6, §4.3 — Operations: cloud and virtualization.
- Cap. 8, §5 — Configuration management: release engineering.
