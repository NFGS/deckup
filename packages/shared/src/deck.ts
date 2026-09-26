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

/** Field limits shared by the API contract and the web forms. */
export const DECK_TITLE_MAX_LENGTH = 120;
export const DECK_DESCRIPTION_MAX_LENGTH = 500;
export const DECK_SUBJECT_MAX_LENGTH = 60;
export const DECK_TAG_MAX_LENGTH = 40;
export const DECK_TAGS_MAX_COUNT = 20;

const deckTagSchema = z.string().trim().min(1).max(DECK_TAG_MAX_LENGTH);

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
  title: z.string().trim().min(1).max(DECK_TITLE_MAX_LENGTH),
  description: z.string().trim().max(DECK_DESCRIPTION_MAX_LENGTH).optional(),
  subject: z.string().trim().max(DECK_SUBJECT_MAX_LENGTH).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #1E88E5')
    .optional(),
  visibility: deckVisibilitySchema.default('PRIVATE'),
  tags: z.array(deckTagSchema).max(DECK_TAGS_MAX_COUNT).default([]),
});

export type CreateDeck = z.infer<typeof createDeckSchema>;

export const updateDeckSchema = z
  .object({
    title: z.string().trim().min(1).max(DECK_TITLE_MAX_LENGTH).optional(),
    description: z.string().trim().max(DECK_DESCRIPTION_MAX_LENGTH).nullable().optional(),
    subject: z.string().trim().max(DECK_SUBJECT_MAX_LENGTH).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #1E88E5')
      .nullable()
      .optional(),
    visibility: deckVisibilitySchema.optional(),
    tags: z.array(deckTagSchema).max(DECK_TAGS_MAX_COUNT).optional(),
  })
  .refine(hasAtLeastOneKey, { message: 'At least one field must be provided' });

export type UpdateDeck = z.infer<typeof updateDeckSchema>;

export const deckListQuerySchema = paginationQuerySchema.extend({
  subject: z.string().trim().min(1).max(60).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

export type DeckListQuery = z.infer<typeof deckListQuerySchema>;

export const deckSubjectsResponseSchema = z.object({
  subjects: z.array(z.string()),
});

export type DeckSubjectsResponse = z.infer<typeof deckSubjectsResponseSchema>;

export const publicDeckSchema = deckSchema.extend({
  authorName: z.string().min(1),
});

export type PublicDeck = z.infer<typeof publicDeckSchema>;

export const publicDeckListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().min(1).max(60).optional(),
});

export type PublicDeckListQuery = z.infer<typeof publicDeckListQuerySchema>;

export const cloneDeckSchema = z
  .object({
    title: z.string().trim().min(1).max(DECK_TITLE_MAX_LENGTH).optional(),
  })
  .default({});

export type CloneDeck = z.infer<typeof cloneDeckSchema>;
