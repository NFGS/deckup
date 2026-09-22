import type { ReviewRating } from '@deckup/shared';

import { ReviewLog } from '../../../domain/entities/review-log.entity.js';

export interface ReviewLogData {
  id: string;
  cardId: string;
  userId: string;
  sessionId: string | null;
  clientReviewId: string | null;
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
    clientReviewId: log.clientReviewId,
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

export function toDomainReviewLog(row: ReviewLogData): ReviewLog {
  return ReviewLog.restore({
    id: row.id,
    cardId: row.cardId,
    userId: row.userId,
    sessionId: row.sessionId,
    clientReviewId: row.clientReviewId,
    rating: row.rating,
    reviewedAt: row.reviewedAt,
    elapsedMs: row.elapsedMs,
    scheduledDays: row.scheduledDays,
    previousDueAt: row.previousDueAt,
    nextDueAt: row.nextDueAt,
    stabilityAfter: row.stabilityAfter,
    difficultyAfter: row.difficultyAfter,
  });
}
