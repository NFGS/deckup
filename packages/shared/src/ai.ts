import { z } from 'zod';

export const cardSuggestionRequestSchema = z.object({
  notes: z.string().trim().min(20).max(20000),
  maxCards: z.coerce.number().int().min(1).max(30).default(10),
});

export type CardSuggestionRequest = z.infer<typeof cardSuggestionRequestSchema>;

export const cardSuggestionSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().nullable(),
});

export type CardSuggestion = z.infer<typeof cardSuggestionSchema>;

export const cardSuggestionResponseSchema = z.object({
  suggestions: z.array(cardSuggestionSchema),
});

export type CardSuggestionResponse = z.infer<typeof cardSuggestionResponseSchema>;
