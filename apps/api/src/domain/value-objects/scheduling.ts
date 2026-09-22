import type { CardState, ReviewRating } from '@deckup/shared';

/**
 * Scheduling state of a card, as seen by the domain.
 */
export interface SchedulingSnapshot {
  state: CardState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  lastReviewAt: Date | null;
  dueAt: Date;
}

/**
 * Result of applying a rating to a card.
 */
export interface SchedulingOutcome {
  state: CardState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  scheduledDays: number;
  lastReviewAt: Date;
  dueAt: Date;
}

export interface ScheduleRequest {
  snapshot: SchedulingSnapshot;
  rating: ReviewRating;
  now: Date;
}
