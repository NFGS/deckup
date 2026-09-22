import { z } from 'zod';

/**
 * Visibility of a flashcard deck.
 *
 * - `PRIVATE`  — only the owner can access it.
 * - `UNLISTED` — accessible by link, hidden from public listings.
 * - `PUBLIC`   — discoverable in the community library.
 */
export const deckVisibilitySchema = z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']);

export type DeckVisibility = z.infer<typeof deckVisibilitySchema>;
