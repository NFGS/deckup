# ADR 0003: PostgreSQL 17 with Prisma 7 and the pg driver adapter

**Date**: 2026-09-22
**Status**: Accepted
**Authors**: Fabián Gallego

## Context

DeckUp's data is strongly relational: users own decks, decks contain cards, and every card
has scheduling state plus an immutable review history. Analytics (retention, streaks,
forecasts) are aggregate queries over time-series-like tables. The domain requires
transactional imports, precise timestamp handling and indexable access paths
(`dueAt`, `userId + dueAt`, `cardId + reviewedAt`).

Type safety is a first-class concern: schema drift between the database and TypeScript
must fail at compile time, not at runtime.

## Decision

Use **PostgreSQL 17** as the only datastore and **Prisma ORM 7** as the data-access layer,
configured with the **`@prisma/adapter-pg` driver adapter** and the new `prisma-client`
generator that emits TypeScript into `apps/api/src/generated/prisma`.

Access rules:

- Prisma is used **exclusively inside `infrastructure/` repositories** that implement
  domain/application ports.
- No raw SQL outside repositories; migrations are immutable once applied.

## Alternatives considered

1. **Drizzle ORM**
   - Pros: SQL-first, very light, excellent type inference.
   - Contras: fewer guardrails for migrations and relation modeling; the team's prior
     experience is with Prisma; less opinionated tooling for a teaching-grade project.
2. **TypeORM**
   - Pros: established in the NestJS ecosystem.
   - Contras: decorator-heavy entities leak persistence into the domain; migration
     ergonomics and type safety are weaker than Prisma's.
3. **Raw SQL / `pg`**
   - Pros: maximum control and performance.
   - Contras: hand-written types and mapping, no migration tooling, high risk of drift.
4. **NoSQL (MongoDB)**
   - Pros: flexible documents.
   - Contras: the review-log/analytics workload is relational and aggregate-heavy;
     PostgreSQL handles it with simpler consistency guarantees.

## Trade-offs and justification

| Criterion         | Prisma 7 | Drizzle | TypeORM | Raw SQL |
| ----------------- | -------- | ------- | ------- | ------- |
| Type safety       | ✅       | ✅      | ⚠️      | ❌      |
| Migration tooling | ✅       | ⚠️      | ⚠️      | ❌      |
| Query control     | ⚠️       | ✅      | ⚠️      | ✅      |
| Learning curve    | ✅       | ⚠️      | ⚠️      | ❌      |

Prisma 7's driver adapter removes the Rust query engine and runs entirely on the
`pg` driver, which simplifies deployment (no engine binaries in the container) while
keeping the typed client and migration workflow. The repository pattern isolates the
choice: replacing Prisma later means rewriting `infrastructure/` only.

## Consequences

- **Positive**: single source of truth for the schema; generated client is compiled with
  the API; typed queries; deterministic migrations; Docker-friendly runtime (no engine
  binary).
- **Negative / risks**: the generated client lives under `src/generated/prisma` and must be
  excluded from lint/formatting and regenerated before build/typecheck; Prisma 7 requires a
  driver adapter instance (`PrismaPg`) at construction time; the project must stay on the
  stable 7.x line while 8.x is in release-candidate state.
- **Required actions**: `prisma generate` runs before `build` and `typecheck`; the
  generated folder is git-ignored; connection string comes from `DATABASE_URL` and is
  validated at startup (fail fast).

## References SWEBOK

- Cap. 3, §4.6 — Design patterns: repository and data mapper.
- Cap. 6, §2.1 — Operations: data management and persistence.
- Cap. 12, §2.2 — Software quality: reliability through typed persistence boundaries.
