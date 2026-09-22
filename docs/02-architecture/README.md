# 02 — Architecture

Architecture description and decision records for DeckUp.

## Planned contents

| File                    | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `overview.md`           | C4 context and container views (Mermaid)                         |
| `adr/`                  | Architecture Decision Records (stack, FSRS, auth, deployment, …) |
| `data-model.md`         | Entity-relationship model and Prisma schema rationale            |
| `use-case-diagram.puml` | UML use-case diagram (PlantUML)                                  |
| `openapi.yaml`          | REST API contract (`/api/v1`)                                    |

Architecture style: Clean Architecture (domain / application / infrastructure / presentation)
inside the NestJS API; feature-first React application on the web side.
