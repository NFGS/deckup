import { randomUUID } from 'node:crypto';

import type { ReviewRating, SessionStatus, StudyMode } from '@deckup/shared';

import { ConflictError } from '../errors/domain-errors.js';

const SUCCESSFUL_RATINGS: readonly ReviewRating[] = ['GOOD', 'EASY'];

export interface StudySessionProps {
  id: string;
  userId: string;
  deckId: string;
  mode: StudyMode;
  status: SessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  cardsReviewed: number;
  correctCount: number;
}

export interface StartStudySessionInput {
  userId: string;
  deckId: string;
  mode?: StudyMode;
  id?: string;
  now?: Date;
}

export class StudySession {
  private constructor(private readonly props: StudySessionProps) {}

  static start(input: StartStudySessionInput): StudySession {
    const now = input.now ?? new Date();

    return new StudySession({
      id: input.id ?? randomUUID(),
      userId: input.userId,
      deckId: input.deckId,
      mode: input.mode ?? 'DUE',
      status: 'ACTIVE',
      startedAt: now,
      endedAt: null,
      cardsReviewed: 0,
      correctCount: 0,
    });
  }

  static restore(props: StudySessionProps): StudySession {
    return new StudySession(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get deckId(): string {
    return this.props.deckId;
  }

  get mode(): StudyMode {
    return this.props.mode;
  }

  get status(): SessionStatus {
    return this.props.status;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get endedAt(): Date | null {
    return this.props.endedAt;
  }

  get cardsReviewed(): number {
    return this.props.cardsReviewed;
  }

  get correctCount(): number {
    return this.props.correctCount;
  }

  get isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  get isCompleted(): boolean {
    return this.props.status === 'COMPLETED';
  }

  recordReview(rating: ReviewRating): StudySession {
    this.assertActive();

    return new StudySession({
      ...this.props,
      cardsReviewed: this.props.cardsReviewed + 1,
      correctCount: this.props.correctCount + (SUCCESSFUL_RATINGS.includes(rating) ? 1 : 0),
    });
  }

  complete(now = new Date()): StudySession {
    if (this.props.status === 'ABANDONED') {
      throw new ConflictError('An abandoned session cannot be completed');
    }

    if (this.props.status === 'COMPLETED') {
      return this;
    }

    return new StudySession({ ...this.props, status: 'COMPLETED', endedAt: now });
  }

  abandon(now = new Date()): StudySession {
    if (this.props.status === 'COMPLETED') {
      throw new ConflictError('A completed session cannot be abandoned');
    }

    if (this.props.status === 'ABANDONED') {
      return this;
    }

    return new StudySession({ ...this.props, status: 'ABANDONED', endedAt: now });
  }

  get accuracy(): number {
    return this.props.cardsReviewed === 0 ? 0 : this.props.correctCount / this.props.cardsReviewed;
  }

  private assertActive(): void {
    if (!this.isActive) {
      throw new ConflictError('The study session is no longer active');
    }
  }
}
