# ADR 0002: NestJS 12 on Fastify with Clean Architecture

**Date**: 2026-09-22
**Status**: Accepted
**Authors**: Fabián Gallego

## Context

The API must implement non-trivial business rules — FSRS scheduling, streak and retention
calculations, CSV import validation — while remaining testable in isolation and open to
adapters (PostgreSQL, Cloudinary, LLM providers). The project also has an academic
requirement to demonstrate a rigorous, layered architecture with explicit dependency
rules.

Performance matters for study mode (a card transition budget of 100 ms p95) and the
backend must support dependency injection, guards, validation pipes and structured
logging out of the box.

## Decision

Build the API with **NestJS 12 running on the Fastify adapter**, organized in four layers
following **Clean Architecture**:

```
presentation → application → domain
infrastructure implements ports defined by application/domain
```

- `domain/` — entities, value objects and domain services; pure TypeScript, no framework imports.
- `application/` — one class per use case plus ports (repository/service interfaces).
- `infrastructure/` — Prisma repositories, `ts-fsrs` adapter, Cloudinary adapter.
- `presentation/` — controllers, DTOs, Zod validation pipes, guards, filters.

## Alternatives considered

1. **Express with a manual layered structure**
   - Pros: minimal, familiar, tiny surface.
   - Contras: no DI container, no first-class guards/pipes/interceptors; discipline is
     enforced only by convention, which decays under pressure.
2. **Fastify alone**
   - Pros: fastest raw throughput, small API.
   - Contras: same structural gaps as Express; plugin ecosystem for validation/auth is
     less uniform.
3. **Next.js API routes (single framework full-stack)**
   - Pros: one deployment, less infrastructure.
   - Contras: serverless-oriented runtime complicates long-lived Prisma connections and
     background scheduling; the layered architecture would be harder to isolate and test.
4. **Spring Boot / .NET**
   - Pros: mature enterprise ecosystems.
   - Contras: leaves the TypeScript stack, duplicating contracts and tooling.

## Trade-offs and justification

| Criterion                | Nest+Fastify  | Express manual | Next.js routes |
| ------------------------ | ------------- | -------------- | -------------- |
| Architecture enforcement | ✅ modules+DI | ❌ convention  | ⚠️ mixed       |
| Raw performance          | ✅ Fastify    | ⚠️             | ⚠️             |
| Testing seams            | ✅ DI + ports | ⚠️             | ⚠️             |
| Boilerplate              | ⚠️ higher     | ✅ low         | ✅ low         |

The scheduling domain is the heart of the product: it must be testable without HTTP or a
database. Nest's DI container and module boundaries make the Clean Architecture dependency
rule mechanically enforceable, and the Fastify adapter recovers most of the performance
cost of the framework. The extra boilerplate is accepted deliberately.

## Consequences

- **Positive**: domain logic is framework-free and unit-testable; adapters are replaceable;
  guards/pipes/filters standardize auth, validation and error mapping.
- **Negative / risks**: more files per feature; Nest-specific knowledge required;
  decorators require `experimentalDecorators` + `emitDecoratorMetadata` (and therefore
  TypeScript 6.x, since TS 7 native decorator support is not yet compatible with Nest).
- **Required actions**: keep domain imports clean (enforced by review and lint), write one
  use case per action, never inject Prisma into controllers.

## References SWEBOK

- Cap. 2, §2.2 — Architecture viewpoints and layers.
- Cap. 3, §4.2 — Design patterns: dependency injection, ports and adapters.
- Cap. 3, §4.4 — Design rationale: separation of concerns.
