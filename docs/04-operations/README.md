# 04 — Operations

Deployment and operations documentation for DeckUp.

| File                                     | Description                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| [`deployment.md`](./deployment.md)       | Environments, variables, release process, rollback (Vercel + Railway + Neon) |
| [`runbook.md`](./runbook.md)             | Routine checks and incident playbooks                                        |
| [`backup-policy.md`](./backup-policy.md) | Backup mechanisms, restore procedure and monthly drill                       |
| [`security.md`](./security.md)           | Security controls, OWASP mapping, accepted risks and incident response       |

## Local infrastructure

`docker compose up -d` starts PostgreSQL 17 and Adminer (http://localhost:8080).
The API container image is built from `apps/api/Dockerfile` (context: repository root).
