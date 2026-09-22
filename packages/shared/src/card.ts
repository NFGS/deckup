import { z } from 'zod';

import { paginationQuerySchema } from './pagination.js';
import { hasAtLeastOneKey } from './utils.js';

export const cardDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export type CardDifficulty = z.infer<typeof cardDifficultySchema>;

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
