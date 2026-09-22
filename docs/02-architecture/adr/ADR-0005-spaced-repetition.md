# ADR 0005: FSRS via ts-fsrs behind a domain port

**Date**: 2026-09-22
**Status**: Accepted
**Authors**: Fabián Gallego

## Context

The product promise is "review each card right before you forget it". The scheduling
algorithm is therefore the core domain asset of DeckUp: it determines intervals, daily
workload and, ultimately, exam performance.

The algorithm must be:

- **effective** — evidence-based and battle-tested at scale (Anki's user base),
- **deterministic and testable** — same inputs, same schedule, so the domain can be
  unit-tested without a database,
- **replaceable** — the domain must not depend on a specific library's API.

## Decision

Use **FSRS (Free Spaced Repetition Scheduler)** through the **`ts-fsrs` v5** library,
encapsulated behind a domain port:

```ts
// domain/ports/scheduler.port.ts
export interface SchedulerPort {
  schedule(state: CardSchedule, rating: ReviewRating, now: Date): CardSchedule;
}
```

- The **domain service** (`SchedulingService`) owns the rules and calls the port.
- The **infrastructure adapter** wraps `ts-fsrs` (FSRS-6) and is the only place importing it.
- Scheduling parameters (desired retention, learning steps, fuzz) are configuration, versioned
  with the review state so future parameter changes remain auditable.

## Alternatives considered

1. **SM-2 (hand-implemented)**
   - Pros: simple, well documented, no dependency; good academic exercise.
   - Contras: inferior interval quality (no memory-stability model, fixed ease factor);
     known weaknesses on lapses and long intervals; students would study more for the same
     retention.
2. **Leitner box system**
   - Pros: trivial to implement and explain.
   - Contras: coarse-grained scheduling; no personalization; unsuitable for exam deadlines.
3. **Custom heuristic (spacing multipliers)**
   - Pros: full control.
   - Contras: no empirical basis; tuning without data is guesswork; high risk of harming
     the core value proposition.
4. **FSRS reimplemented in-house**
   - Pros: no external dependency, deep learning value.
   - Contras: the algorithm is non-trivial (stability/difficulty dynamics, fuzzing,
     parameter fitting); an incorrect reimplementation silently corrupts schedules.

## Trade-offs and justification

| Criterion           | ts-fsrs (port)           | SM-2 hand-rolled | Leitner | Custom  |
| ------------------- | ------------------------ | ---------------- | ------- | ------- |
| Scheduling quality  | ✅ FSRS-6                | ⚠️               | ❌      | ❓      |
| Implementation risk | ✅ low                   | ⚠️ medium        | ✅ low  | ❌ high |
| Testability         | ✅ via port              | ✅               | ✅      | ✅      |
| Learning value      | ✅ (integration + rules) | ✅ (algorithm)   | ✅      | ✅      |

`ts-fsrs` is MIT-licensed, TypeScript-native, actively maintained and used in production
flashcard apps. Placing it behind a port preserves the option to implement SM-2 or a
trained FSRS variant later without touching use cases. The domain keeps ownership of the
_policy_ (which cards are due, how streaks and retention are defined); the library owns only
the _interval mathematics_.

## Consequences

- **Positive**: high-quality scheduling on day one; domain tests use a deterministic fake
  scheduler; library upgrades are isolated to one adapter.
- **Negative / risks**: dependency on a third-party algorithm; FSRS parameter optimization
  (`@open-spaced-repetition/binding`) is out of scope for the MVP; users' historical
  schedules become tied to the FSRS version (mitigated by storing `schedulerVersion` in
  the review state).
- **Required actions**: wrap the library, never import it in domain/application; store
  `stability`, `difficulty`, `state`, `reps`, `lapses`, `dueAt` and `schedulerVersion`;
  document the rating semantics (ADR-0004 glossary).

## References SWEBOK

- Cap. 3, §4.2 — Design patterns: ports and adapters (hexagonal architecture).
- Cap. 11, §2.1 — Research methods: using validated external algorithms.
- Cap. 12, §3.1 — Quality: correctness of domain-critical computations.
