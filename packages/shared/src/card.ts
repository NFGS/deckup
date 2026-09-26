import { z } from 'zod';

import { paginationQuerySchema } from './pagination.js';
import { hasAtLeastOneKey } from './utils.js';

export const cardDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export type CardDifficulty = z.infer<typeof cardDifficultySchema>;

/** Maximum size accepted for a card image (5 MB, NFR-03.1). */
export const CARD_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const CARD_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export type CardImageMimeType = (typeof CARD_IMAGE_MIME_TYPES)[number];

/** Field limits shared by the API contract and the web forms. */
export const CARD_FRONT_MAX_LENGTH = 2000;
export const CARD_BACK_MAX_LENGTH = 2000;
export const CARD_HINT_MAX_LENGTH = 300;
export const CARD_TAG_MAX_LENGTH = 40;
export const CARD_TAGS_MAX_COUNT = 20;

const cardTagSchema = z.string().trim().min(1).max(CARD_TAG_MAX_LENGTH);

export const cardSchema = z.object({
  id: z.uuid(),
  deckId: z.uuid(),
  front: z.string(),
  back: z.string(),
  hint: z.string().nullable(),
  imageUrl: z.string().nullable(),
  difficulty: cardDifficultySchema.nullable(),
  tags: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Card = z.infer<typeof cardSchema>;

export const createCardSchema = z.object({
  front: z.string().trim().min(1).max(CARD_FRONT_MAX_LENGTH),
  back: z.string().trim().min(1).max(CARD_BACK_MAX_LENGTH),
  hint: z.string().trim().max(CARD_HINT_MAX_LENGTH).optional(),
  imageUrl: z.url().optional(),
  difficulty: cardDifficultySchema.optional(),
  tags: z.array(cardTagSchema).max(CARD_TAGS_MAX_COUNT).default([]),
});

export type CreateCard = z.infer<typeof createCardSchema>;

export const updateCardSchema = z
  .object({
    front: z.string().trim().min(1).max(CARD_FRONT_MAX_LENGTH).optional(),
    back: z.string().trim().min(1).max(CARD_BACK_MAX_LENGTH).optional(),
    hint: z.string().trim().max(CARD_HINT_MAX_LENGTH).nullable().optional(),
    imageUrl: z.url().nullable().optional(),
    difficulty: cardDifficultySchema.nullable().optional(),
    tags: z.array(cardTagSchema).max(CARD_TAGS_MAX_COUNT).optional(),
  })
  .refine(hasAtLeastOneKey, { message: 'At least one field must be provided' });

export type UpdateCard = z.infer<typeof updateCardSchema>;

export const cardListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(200).optional(),
});

export type CardListQuery = z.infer<typeof cardListQuerySchema>;
