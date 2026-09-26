import type { CardState } from '@deckup/shared';

import { ReviewState } from '../../../domain/entities/review-state.entity.js';

export interface ReviewStateRow {
  cardId: string;
  userId: string;
  stability: number;
  difficulty: number;
  state: CardState;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningSteps: number;
  lastReviewAt: Date | null;
  dueAt: Date;
  schedulerVersion: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toDomainReviewState(row: ReviewStateRow): ReviewState {
  return ReviewState.restore({ ...row });
}

export function toReviewStateData(state: ReviewState) {
  return {
    userId: state.userId,
    stability: state.stability,
    difficulty: state.difficulty,
    state: state.state,
    reps: state.reps,
    lapses: state.lapses,
    scheduledDays: state.scheduledDays,
    learningSteps: state.learningSteps,
    lastReviewAt: state.lastReviewAt,
    dueAt: state.dueAt,
    schedulerVersion: state.schedulerVersion,
    version: state.version,
  };
}
