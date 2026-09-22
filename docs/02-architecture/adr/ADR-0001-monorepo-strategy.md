# ADR 0001: Monorepo with pnpm workspaces and Turborepo

**Date**: 2026-09-22
**Status**: Accepted
**Authors**: Fabián Gallego

## Context

DeckUp ships three artifacts that evolve together: a web client (`apps/web`), an API
(`apps/api`) and a contracts package (`packages/shared`) whose Zod schemas are consumed by
both sides. A change to a domain contract (for example the `ReviewRating` scale) must land
in the API and the web client **atomically**; if the two sides drift, runtime validation
fails in production.

The project is maintained by a single developer with a strong tooling baseline
(TypeScript everywhere, one test runner family, one linter) and requires reproducible
installs and fast incremental builds.

## Decision

Adopt a **single monorepo** managed with **pnpm workspaces** and **Turborepo**:

```
apps/web · apps/api · packages/shared · packages/config
```

- pnpm provides the workspace protocol (`workspace:*`), strict dependency isolation and a
  content-addressable store.
- Turborepo orchestrates `build`, `lint`, `typecheck` and `test` with dependency-aware
  scheduling (`^build`) and local caching.

## Alternatives considered

1. **Polyrepo (three repositories)**
   - Pros: independent CI and release cadence per artifact; hard boundaries.
   - Contras: contract changes require coordinated PRs and versioned package publishing;
     tooling must be duplicated; high friction for a one-person team.
2. **npm/yarn workspaces**
   - Pros: zero additional tooling beyond the package manager.
   - Contras: slower installs, weaker workspace isolation than pnpm, no task graph or
     caching (would require adding Nx/Turbo anyway).
3. **Nx**
   - Pros: powerful generators, graph visualization, rich caching.
   - Contras: heavier learning curve and configuration surface than the project needs;
     opinionated structure adds noise for a four-package workspace.

## Trade-offs and justification

| Criterion              | Monorepo (pnpm+Turbo) | Polyrepo       | npm/yarn workspaces |
| ---------------------- | --------------------- | -------------- | ------------------- |
| Atomic contract change | ✅ one PR             | ❌ coordinated | ✅                  |
| Install speed          | ✅                    | ⚠️ per repo    | ⚠️ slower           |
| Build orchestration    | ✅ task graph + cache | ⚠️ manual      | ❌ none             |
| Repository size        | ⚠️ grows together     | ✅ bounded     | ⚠️                  |

The decisive factor is atomicity of shared contracts combined with the operational
simplicity that pnpm + Turbo provide. Polyrepo would add release engineering overhead with
no benefit at this scale; Nx would add capability the project will not use.

## Consequences

- **Positive**: one `pnpm install`, one quality-gate command set, one CI pipeline, shared
  TypeScript presets (`packages/config`, consumed by `packages/shared`), cached incremental
  builds.
- **Negative / risks**: the repository grows as a whole; Turborepo cache must be understood
  (a stale cache can mask a broken build — mitigated by `--force` in releases and by CI
  running without remote cache initially).
- **Required actions**: keep `turbo.json` task graph accurate; every code package declares
  explicit `lint`, `typecheck`, `test` and `build` scripts (`packages/config` is
  configuration-only); CI runs with `--frozen-lockfile`.

## References SWEBOK

- Cap. 2, §3.2 — Architecture synthesis: decomposition and grouping of components.
- Cap. 8, §2 — Software configuration management: build and dependency management.
