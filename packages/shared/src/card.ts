import { z } from 'zod';

import { paginationQuerySchema } from './pagination.js';
import { hasAtLeastOneKey } from './utils.js';

export const cardDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export type CardDifficulty = z.infer<typeof cardDifficultySchema>;

/** Maximum size accepted for a card image (5 MB, NFR-03.1). */
export const CARD_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const CARD_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export type CardImageMimeType = (typeof CARD_IMAGE_MIME_TYPES)[number];

const cardTagSchema = z.string().trim().min(1).max(40);

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
  front: z.string().trim().min(1).max(2000),
  back: z.string().trim().min(1).max(2000),
  hint: z.string().trim().max(300).optional(),
  imageUrl: z.url().optional(),
  difficulty: cardDifficultySchema.optional(),
  tags: z.array(cardTagSchema).max(20).default([]),
});

export type CreateCard = z.infer<typeof createCardSchema>;

export const updateCardSchema = z
  .object({
    front: z.string().trim().min(1).max(2000).optional(),
    back: z.string().trim().min(1).max(2000).optional(),
    hint: z.string().trim().max(300).nullable().optional(),
    imageUrl: z.url().nullable().optional(),
    difficulty: cardDifficultySchema.nullable().optional(),
    tags: z.array(cardTagSchema).max(20).optional(),
  })
  .refine(hasAtLeastOneKey, { message: 'At least one field must be provided' });

export type UpdateCard = z.infer<typeof updateCardSchema>;

export const cardListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(200).optional(),
});

export type CardListQuery = z.infer<typeof cardListQuerySchema>;
