# 02 — Architecture

Architecture description and decision records for DeckUp.

| File                                               | Description                                                     |
| -------------------------------------------------- | --------------------------------------------------------------- |
| [`overview.md`](./overview.md)                     | C4 context, container, component and deployment views           |
| [`data-model.md`](./data-model.md)                 | ERD, entity catalog, indexes and Prisma mapping                 |
| [`use-case-diagram.puml`](./use-case-diagram.puml) | UML use-case diagram (PlantUML, SENA conventions adapted to EN) |
| [`openapi.yaml`](./openapi.yaml)                   | REST API contract for `/api/v1` (OpenAPI 3.1)                   |
| [`adr/`](./adr)                                    | Architecture Decision Records (ADR-0001 … ADR-0008)             |

Architecture style: Clean Architecture (domain / application / infrastructure /
presentation) inside the NestJS API; feature-first React application on the web side.
