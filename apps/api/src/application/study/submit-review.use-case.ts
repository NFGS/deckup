import { Inject, Injectable } from '@nestjs/common';
import type { CardState, ReviewRating, StudyMode, SubmitReview } from '@deckup/shared';

import { ReviewLog } from '../../domain/entities/review-log.entity.js';
import { ReviewState } from '../../domain/entities/review-state.entity.js';
import { ConflictError, NotFoundError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { ReviewLogRepositoryPort as ReviewLogRepository } from '../../domain/ports/review-log.repository.js';
import type { ReviewLogRepositoryPort } from '../../domain/ports/review-log.repository.js';
import { ReviewRecorderPort as ReviewRecorder } from '../../domain/ports/review-recorder.port.js';
import type { ReviewRecorderPort } from '../../domain/ports/review-recorder.port.js';
import { ReviewStateRepositoryPort as ReviewStateRepository } from '../../domain/ports/review-state.repository.js';
import type { ReviewStateRepositoryPort } from '../../domain/ports/review-state.repository.js';
import { StudyQueueRepositoryPort as StudyQueueRepository } from '../../domain/ports/study-queue.repository.js';
import type { StudyQueueRepositoryPort } from '../../domain/ports/study-queue.repository.js';
import { StudySessionRepositoryPort as StudySessionRepository } from '../../domain/ports/study-session.repository.js';
import type { StudySessionRepositoryPort } from '../../domain/ports/study-session.repository.js';
import { SchedulingService } from '../../domain/services/scheduling.service.js';

const MAX_RECORD_ATTEMPTS = 3;

export interface ReviewOutcome {
  cardId: string;
  rating: ReviewRating;
  nextDueAt: Date;
  scheduledDays: number;
  state: CardState;
  remaining: number;
}

@Injectable()
export class SubmitReviewUseCase {
  constructor(
    @Inject(StudySessionRepository) private readonly sessions: StudySessionRepositoryPort,
    @Inject(CardRepository) private readonly cards: CardRepositoryPort,
    @Inject(ReviewStateRepository) private readonly reviewStates: ReviewStateRepositoryPort,
    @Inject(ReviewLogRepository) private readonly reviewLogs: ReviewLogRepositoryPort,
    @Inject(ReviewRecorder) private readonly recorder: ReviewRecorderPort,
    @Inject(StudyQueueRepository) private readonly queue: StudyQueueRepositoryPort,
    private readonly scheduling: SchedulingService,
  ) {}

  async execute(sessionId: string, userId: string, input: SubmitReview): Promise<ReviewOutcome> {
    const session = await this.sessions.findByIdForUser(sessionId, userId);
    if (!session) {
      throw new NotFoundError('Study session', sessionId);
    }

    if (!session.isActive) {
      throw new ConflictError('The study session is no longer active');
    }

    const card = await this.cards.findByIdForOwner(input.cardId, userId);
    if (!card || card.deckId !== session.deckId) {
      throw new NotFoundError('Card', input.cardId);
    }

    const now = new Date();

    if (input.clientReviewId) {
      const replayed = await this.replay(
        session.id,
        input.clientReviewId,
        card.id,
        session.deckId,
        session.mode,
        now,
      );

      if (replayed) {
        return replayed;
      }
    }

    for (let attempt = 1; attempt <= MAX_RECORD_ATTEMPTS; attempt += 1) {
      const current =
        (await this.reviewStates.findByCardId(card.id)) ??
        ReviewState.createNew({
          cardId: card.id,
          userId,
          schedulerVersion: this.scheduling.schedulerVersion,
          now,
        });

      const outcome = this.scheduling.applyRating(current.toSnapshot(), input.rating, now);
      const nextState = current.applyOutcome(outcome, now);

      const log = ReviewLog.create({
        cardId: card.id,
        userId,
        sessionId: session.id,
        clientReviewId: input.clientReviewId ?? null,
        rating: input.rating,
        reviewedAt: now,
        elapsedMs: input.elapsedMs ?? null,
        scheduledDays: outcome.scheduledDays,
        previousDueAt: current.dueAt,
        nextDueAt: outcome.dueAt,
        stabilityAfter: outcome.stability,
        difficultyAfter: outcome.difficulty,
      });

      const updatedSession = session.recordReview(input.rating);

      const result = await this.recorder.record({
        state: nextState,
        log,
        session: updatedSession,
        expectedVersion: current.version,
      });

      if (result.status === 'duplicate' && input.clientReviewId) {
        const replayed = await this.replay(
          session.id,
          input.clientReviewId,
          card.id,
          session.deckId,
          session.mode,
          now,
        );

        if (replayed) {
          return replayed;
        }
      }

      if (result.status === 'recorded') {
        const remaining = await this.queue.count(session.deckId, session.mode, now);

        return {
          cardId: card.id,
          rating: input.rating,
          nextDueAt: outcome.dueAt,
          scheduledDays: outcome.scheduledDays,
          state: outcome.state,
          remaining,
        };
      }
    }

    throw new ConflictError('The card was updated concurrently; please try again');
  }

  private async replay(
    sessionId: string,
    clientReviewId: string,
    cardId: string,
    deckId: string,
    mode: StudyMode,
    now: Date,
  ): Promise<ReviewOutcome | null> {
    const existing = await this.reviewLogs.findByClientReviewId(sessionId, clientReviewId);

    if (!existing) {
      return null;
    }

    if (existing.cardId !== cardId) {
      throw new ConflictError('This review id was already used for another card');
    }

    const state = await this.reviewStates.findByCardId(cardId);
    const remaining = await this.queue.count(deckId, mode, now);

    return {
      cardId,
      rating: existing.rating,
      nextDueAt: existing.nextDueAt,
      scheduledDays: existing.scheduledDays,
      state: state?.state ?? 'NEW',
      remaining,
    };
  }
}
