import { z } from 'zod';

import { paginationQuerySchema } from './pagination.js';
import { hasAtLeastOneKey } from './utils.js';

/**
 * Visibility of a flashcard deck.
 *
 * - `PRIVATE`  — only the owner can access it.
 * - `UNLISTED` — accessible by link, hidden from public listings.
 * - `PUBLIC`   — discoverable in the community library.
 */
export const deckVisibilitySchema = z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']);

export type DeckVisibility = z.infer<typeof deckVisibilitySchema>;

const deckTagSchema = z.string().trim().min(1).max(40);

export const deckSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  subject: z.string().nullable(),
  color: z.string().nullable(),
  visibility: deckVisibilitySchema,
  tags: z.array(z.string()),
  cardCount: z.number().int().nonnegative(),
  dueCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Deck = z.infer<typeof deckSchema>;

export const createDeckSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  subject: z.string().trim().max(60).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #1E88E5')
    .optional(),
  visibility: deckVisibilitySchema.default('PRIVATE'),
  tags: z.array(deckTagSchema).max(20).default([]),
});

export type CreateDeck = z.infer<typeof createDeckSchema>;

export const updateDeckSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    subject: z.string().trim().max(60).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #1E88E5')
      .nullable()
      .optional(),
    visibility: deckVisibilitySchema.optional(),
    tags: z.array(deckTagSchema).max(20).optional(),
  })
  .refine(hasAtLeastOneKey, { message: 'At least one field must be provided' });

export type UpdateDeck = z.infer<typeof updateDeckSchema>;

export const deckListQuerySchema = paginationQuerySchema.extend({
  subject: z.string().trim().min(1).max(60).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

export type DeckListQuery = z.infer<typeof deckListQuerySchema>;

export const publicDeckSchema = deckSchema.extend({
  authorName: z.string().min(1),
});

export type PublicDeck = z.infer<typeof publicDeckSchema>;

export const publicDeckListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().min(1).max(60).optional(),
});

export type PublicDeckListQuery = z.infer<typeof publicDeckListQuerySchema>;

export const cloneDeckSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export type CloneDeck = z.infer<typeof cloneDeckSchema>;
