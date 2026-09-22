import type { ReviewRating } from '@deckup/shared';

import type { ReviewLog } from '../../../domain/entities/review-log.entity.js';

export interface ReviewLogData {
  id: string;
  cardId: string;
  userId: string;
  sessionId: string | null;
  rating: ReviewRating;
  reviewedAt: Date;
  elapsedMs: number | null;
  scheduledDays: number;
  previousDueAt: Date | null;
  nextDueAt: Date;
  stabilityAfter: number;
  difficultyAfter: number;
}

export function toReviewLogData(log: ReviewLog): ReviewLogData {
  return {
    id: log.id,
    cardId: log.cardId,
    userId: log.userId,
    sessionId: log.sessionId,
    rating: log.rating,
    reviewedAt: log.reviewedAt,
    elapsedMs: log.elapsedMs,
    scheduledDays: log.scheduledDays,
    previousDueAt: log.previousDueAt,
    nextDueAt: log.nextDueAt,
    stabilityAfter: log.stabilityAfter,
    difficultyAfter: log.difficultyAfter,
  };
}
