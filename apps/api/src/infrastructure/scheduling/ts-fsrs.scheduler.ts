import { Injectable } from '@nestjs/common';
import { Rating, State, fsrs } from 'ts-fsrs';
import type { Card as FsrsCard, Grade } from 'ts-fsrs';
import type { CardState, ReviewRating } from '@deckup/shared';

import { SchedulerPort } from '../../domain/ports/scheduler.port.js';
import type {
  ScheduleRequest,
  SchedulingOutcome,
  SchedulingSnapshot,
} from '../../domain/value-objects/scheduling.js';

const FSRS_VERSION = 'fsrs-6';

const GRADE_BY_RATING: Record<ReviewRating, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

const STATE_BY_FSRS: Record<State, CardState> = {
  [State.New]: 'NEW',
  [State.Learning]: 'LEARNING',
  [State.Review]: 'REVIEW',
  [State.Relearning]: 'RELEARNING',
};

const FSRS_BY_STATE: Record<CardState, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
};

/**
 * Adapter that wraps `ts-fsrs` (FSRS-6) behind the domain port (ADR-0005).
 */
@Injectable()
export class TsFsrsScheduler extends SchedulerPort {
  readonly version = FSRS_VERSION;

  private readonly scheduler = fsrs({
    enable_fuzz: true,
    enable_short_term: true,
  });

  schedule({ snapshot, rating, now }: ScheduleRequest): SchedulingOutcome {
    const { card } = this.scheduler.next(this.toFsrsCard(snapshot), now, GRADE_BY_RATING[rating]);
    return this.toOutcome(card, now);
  }

  private toFsrsCard(snapshot: SchedulingSnapshot): FsrsCard {
    return {
      due: snapshot.dueAt,
      stability: snapshot.stability,
      difficulty: snapshot.difficulty,
      elapsed_days: 0,
      scheduled_days: snapshot.scheduledDays,
      learning_steps: 0,
      reps: snapshot.reps,
      lapses: snapshot.lapses,
      state: FSRS_BY_STATE[snapshot.state],
      last_review: snapshot.lastReviewAt ?? undefined,
    };
  }

  private toOutcome(card: FsrsCard, reviewedAt: Date): SchedulingOutcome {
    return {
      state: STATE_BY_FSRS[card.state],
      stability: card.stability,
      difficulty: card.difficulty,
      reps: card.reps,
      lapses: card.lapses,
      scheduledDays: card.scheduled_days,
      lastReviewAt: card.last_review ?? reviewedAt,
      dueAt: card.due,
    };
  }
}
