# ADR 0004: Zod contracts in @deckup/shared

**Date**: 2026-09-22
**Status**: Accepted
**Authors**: Fabián Gallego

## Context

The web client and the API exchange data at dozens of points: authentication payloads, deck
and card CRUD, study queues, review submissions and analytics responses. Historically this
boundary is where duplication and drift appear: the API defines DTO classes, the client
re-declares interfaces, and nothing guarantees they agree.

DeckUp requires a **single source of truth** that provides:

1. static types at compile time, and
2. runtime validation at the API edge and at the client boundary.

## Decision

Create the workspace package **`@deckup/shared`** containing **Zod 4 schemas** as the only
source of truth for cross-boundary contracts:

```ts
export const reviewRatingSchema = z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']);
export type ReviewRating = z.infer<typeof reviewRatingSchema>;
```

- Types are **inferred** from schemas (`z.infer`), never written by hand.
- The API validates incoming requests with Zod-based pipes and validates outgoing
  responses in integration tests.
- The web client parses critical server responses with the same schemas.
- The published REST contract is documented in `docs/02-architecture/openapi.yaml`.

## Alternatives considered

1. **OpenAPI-first with generated clients**
   - Pros: language-agnostic contract, generated SDK, strong tooling.
   - Contras: generation step and drift management; runtime validation still needs a
     separate library; slower feedback loop for a small team.
2. **tRPC (end-to-end type safety)**
   - Pros: zero codegen, excellent DX when both ends are TypeScript in one repo.
   - Contras: couples client and server at the RPC layer, no language-agnostic contract,
     and the published REST API would disappear — a loss for the academic deliverable.
3. **class-validator + class-transformer DTOs (NestJS default)**
   - Pros: idiomatic in Nest, decorator-based.
   - Contras: classes are not portable to the web client; validation rules and TypeScript
     types can drift; adds a second validation technology.
4. **Hand-written TypeScript interfaces**
   - Pros: zero dependencies.
   - Contras: no runtime validation at all; drift is only discovered in production.

## Trade-offs and justification

| Criterion              | Zod shared           | OpenAPI codegen | tRPC   | class-validator |
| ---------------------- | -------------------- | --------------- | ------ | --------------- |
| Single source of truth | ✅                   | ✅              | ✅     | ⚠️              |
| Runtime validation     | ✅                   | ⚠️ extra lib    | ✅     | ✅              |
| Language-agnostic      | ⚠️ (see OpenAPI doc) | ✅              | ❌     | ❌              |
| Setup cost             | ✅ low               | ⚠️ medium       | ✅ low | ✅ low          |

Zod gives both compile-time types and runtime guards with one dependency and no code
generation, and it works identically in the API and the browser. The OpenAPI document is
maintained as the published contract for external consumers, while Zod remains the
implementation-level source of truth.

## Consequences

- **Positive**: impossible to change a contract in one app only — the shared package
  fails to compile; DTOs stay declarative and small; client can trust parsed responses.
- **Negative / risks**: the shared package must be built before consumers
  (`dependsOn: ^build` in Turborepo); Zod bundle size on the web is non-trivial (mitigated
  by tree-shaking and by importing only the schemas a screen needs).
- **Required actions**: no contract may be declared outside `packages/shared`; every new
  endpoint adds its schemas there first; breaking changes to a schema require a versioned
  migration of the API and the client in the same PR.

## References SWEBOK

- Cap. 3, §4.1 — Design fundamentals: information hiding and interfaces.
- Cap. 4, §3.3 — Construction: use of libraries and frameworks.
- Cap. 12, §2.3 — Quality: correctness at integration boundaries.
