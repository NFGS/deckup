import { randomUUID } from 'node:crypto';

import type { ReviewRating } from '@deckup/shared';

export interface ReviewLogProps {
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

export interface CreateReviewLogInput {
  cardId: string;
  userId: string;
  sessionId: string | null;
  rating: ReviewRating;
  reviewedAt: Date;
  elapsedMs?: number | null;
  scheduledDays: number;
  previousDueAt: Date | null;
  nextDueAt: Date;
  stabilityAfter: number;
  difficultyAfter: number;
  id?: string;
}

/**
 * Immutable record of a single graded review (append-only).
 */
export class ReviewLog {
  private constructor(private readonly props: ReviewLogProps) {}

  static create(input: CreateReviewLogInput): ReviewLog {
    return new ReviewLog({
      id: input.id ?? randomUUID(),
      cardId: input.cardId,
      userId: input.userId,
      sessionId: input.sessionId,
      rating: input.rating,
      reviewedAt: input.reviewedAt,
      elapsedMs: input.elapsedMs ?? null,
      scheduledDays: input.scheduledDays,
      previousDueAt: input.previousDueAt,
      nextDueAt: input.nextDueAt,
      stabilityAfter: input.stabilityAfter,
      difficultyAfter: input.difficultyAfter,
    });
  }

  static restore(props: ReviewLogProps): ReviewLog {
    return new ReviewLog(props);
  }

  get id(): string {
    return this.props.id;
  }

  get cardId(): string {
    return this.props.cardId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get sessionId(): string | null {
    return this.props.sessionId;
  }

  get rating(): ReviewRating {
    return this.props.rating;
  }

  get reviewedAt(): Date {
    return this.props.reviewedAt;
  }

  get elapsedMs(): number | null {
    return this.props.elapsedMs;
  }

  get scheduledDays(): number {
    return this.props.scheduledDays;
  }

  get previousDueAt(): Date | null {
    return this.props.previousDueAt;
  }

  get nextDueAt(): Date {
    return this.props.nextDueAt;
  }

  get stabilityAfter(): number {
    return this.props.stabilityAfter;
  }

  get difficultyAfter(): number {
    return this.props.difficultyAfter;
  }
}
