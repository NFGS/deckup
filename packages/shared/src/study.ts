import { z } from 'zod';

import { reviewRatingSchema } from './review.js';

export const cardStateSchema = z.enum(['NEW', 'LEARNING', 'REVIEW', 'RELEARNING']);

export type CardState = z.infer<typeof cardStateSchema>;

export const sessionStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED']);

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

/**
 * Queue strategy for a study session.
 *
 * - `DUE`   — cards due today or earlier (the daily queue).
 * - `AHEAD` — the next cards by due date, even if not due yet.
 * - `ALL`   — every card in the deck, ordered by due date.
 */
export const studyModeSchema = z.enum(['DUE', 'AHEAD', 'ALL']);

export type StudyMode = z.infer<typeof studyModeSchema>;

export const startStudySessionSchema = z.object({
  mode: studyModeSchema.default('DUE'),
});

export type StartStudySession = z.infer<typeof startStudySessionSchema>;

export const studySessionSchema = z.object({
  id: z.uuid(),
  deckId: z.uuid(),
  mode: studyModeSchema,
  status: sessionStatusSchema,
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
  cardsReviewed: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
});

export type StudySession = z.infer<typeof studySessionSchema>;

export const queueItemSchema = z.object({
  cardId: z.uuid(),
  front: z.string(),
  back: z.string(),
  hint: z.string().nullable(),
  imageUrl: z.string().nullable(),
  state: cardStateSchema,
  dueAt: z.iso.datetime(),
  isNew: z.boolean(),
});

export type QueueItem = z.infer<typeof queueItemSchema>;

export const queueResponseSchema = z.object({
  sessionId: z.uuid(),
  items: z.array(queueItemSchema),
  /** Maximum number of items the server returns per queue request. */
  limit: z.number().int().positive(),
  /** Total cards still due in the session, which can exceed `items.length`. */
  remaining: z.number().int().nonnegative(),
});

export type QueueResponse = z.infer<typeof queueResponseSchema>;

export const submitReviewSchema = z.object({
  cardId: z.uuid(),
  rating: reviewRatingSchema,
  elapsedMs: z.number().int().nonnegative().max(2_147_483_647).optional(),
  /** Client-generated id that makes offline replay idempotent. */
  clientReviewId: z.uuid().optional(),
});

export type SubmitReview = z.infer<typeof submitReviewSchema>;

export const reviewResultSchema = z.object({
  cardId: z.uuid(),
  rating: reviewRatingSchema,
  nextDueAt: z.iso.datetime(),
  scheduledDays: z.number().int().nonnegative(),
  state: cardStateSchema,
  remaining: z.number().int().nonnegative(),
});

export type ReviewResult = z.infer<typeof reviewResultSchema>;

export const sessionSummarySchema = z.object({
  sessionId: z.uuid(),
  cardsReviewed: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  elapsedSeconds: z.number().int().nonnegative(),
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;
