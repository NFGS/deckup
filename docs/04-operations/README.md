# 04 — Operations

Deployment and operations documentation for DeckUp.

## Planned contents

| File               | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `deployment.md`    | Environments, release process, rollback (Vercel + Railway + Neon) |
| `runbook.md`       | Operational procedures: health checks, incidents, common tasks    |
| `backup-policy.md` | Database backup and restore strategy                              |

## Local infrastructure

`docker compose up -d` starts PostgreSQL 17 and Adminer (http://localhost:8080).
