# @deckup/shared

Framework-agnostic contracts shared by the DeckUp API and web client.

- Zod schemas as the single source of truth for runtime validation and static types.
- No runtime dependency on NestJS, React or Prisma.
- Built with `tsc` to ESM (`dist/`); consumers import the compiled package.

## Contents

| Module      | Exports                                  |
| ----------- | ---------------------------------------- |
| `deck.ts`   | `deckVisibilitySchema`, `DeckVisibility` |
| `review.ts` | `reviewRatingSchema`, `ReviewRating`     |
| `health.ts` | `healthResponseSchema`, `HealthResponse` |
