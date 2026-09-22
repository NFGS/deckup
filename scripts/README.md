# scripts

Automation scripts for the DeckUp monorepo.

## Planned

| Script           | Purpose                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `notion-sync.ts` | Publish requirements/architecture docs to the Notion workspace (Phase 8) |
| `seed.ts`        | Seed the development database with demo decks and cards                  |

Prefer TypeScript scripts executed with `pnpm exec tsx <script>` so they share
types and contracts with the applications.
