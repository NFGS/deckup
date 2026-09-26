import type { CardState } from '@deckup/shared';

import type { SchedulingOutcome, SchedulingSnapshot } from '../value-objects/scheduling.js';

export interface ReviewStateProps {
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

export interface CreateReviewStateInput {
  cardId: string;
  userId: string;
  schedulerVersion: string;
  now?: Date;
}

/**
 * Scheduling state of a card for one student.
 *
 * A brand-new card is due immediately and sits in the `NEW` state until the
 * first review moves it into the learning steps (BR-04.1, BR-04.2).
 */
export class ReviewState {
  private constructor(private readonly props: ReviewStateProps) {}

  static createNew(input: CreateReviewStateInput): ReviewState {
    const now = input.now ?? new Date();

    return new ReviewState({
      cardId: input.cardId,
      userId: input.userId,
      stability: 0,
      difficulty: 0,
      state: 'NEW',
      reps: 0,
      lapses: 0,
      scheduledDays: 0,
      learningSteps: 0,
      lastReviewAt: null,
      dueAt: now,
      schedulerVersion: input.schedulerVersion,
      version: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ReviewStateProps): ReviewState {
    return new ReviewState(props);
  }

  get cardId(): string {
    return this.props.cardId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get stability(): number {
    return this.props.stability;
  }

  get difficulty(): number {
    return this.props.difficulty;
  }

  get state(): CardState {
    return this.props.state;
  }

  get reps(): number {
    return this.props.reps;
  }

  get lapses(): number {
    return this.props.lapses;
  }

  get scheduledDays(): number {
    return this.props.scheduledDays;
  }

  get learningSteps(): number {
    return this.props.learningSteps;
  }

  get lastReviewAt(): Date | null {
    return this.props.lastReviewAt;
  }

  get dueAt(): Date {
    return this.props.dueAt;
  }

  get schedulerVersion(): string {
    return this.props.schedulerVersion;
  }

  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isNew(): boolean {
    return this.props.state === 'NEW' && this.props.reps === 0;
  }

  toSnapshot(): SchedulingSnapshot {
    return {
      state: this.props.state,
      stability: this.props.stability,
      difficulty: this.props.difficulty,
      reps: this.props.reps,
      lapses: this.props.lapses,
      scheduledDays: this.props.scheduledDays,
      learningSteps: this.props.learningSteps,
      lastReviewAt: this.props.lastReviewAt,
      dueAt: this.props.dueAt,
    };
  }

  applyOutcome(outcome: SchedulingOutcome, now = new Date()): ReviewState {
    return new ReviewState({
      ...this.props,
      state: outcome.state,
      stability: outcome.stability,
      difficulty: outcome.difficulty,
      reps: outcome.reps,
      lapses: outcome.lapses,
      scheduledDays: outcome.scheduledDays,
      learningSteps: outcome.learningSteps,
      lastReviewAt: outcome.lastReviewAt,
      dueAt: outcome.dueAt,
      version: this.props.version + 1,
      updatedAt: now,
    });
  }
}
