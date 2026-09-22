import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { StudySessionRepositoryPort as StudySessionRepository } from '../../domain/ports/study-session.repository.js';
import type { StudySessionRepositoryPort } from '../../domain/ports/study-session.repository.js';

const MS_PER_SECOND = 1000;

export interface SessionSummaryResult {
  sessionId: string;
  cardsReviewed: number;
  correctCount: number;
  accuracy: number;
  elapsedSeconds: number;
}

@Injectable()
export class CompleteStudySessionUseCase {
  constructor(
    @Inject(StudySessionRepository) private readonly sessions: StudySessionRepositoryPort,
  ) {}

  async execute(sessionId: string, userId: string): Promise<SessionSummaryResult> {
    const session = await this.sessions.findByIdForUser(sessionId, userId);
    if (!session) {
      throw new NotFoundError('Study session', sessionId);
    }

    const completed = session.complete();
    if (completed !== session) {
      await this.sessions.update(completed);
    }

    const endedAt = completed.endedAt ?? new Date();
    const elapsedSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - completed.startedAt.getTime()) / MS_PER_SECOND),
    );

    return {
      sessionId: completed.id,
      cardsReviewed: completed.cardsReviewed,
      correctCount: completed.correctCount,
      accuracy: completed.accuracy,
      elapsedSeconds,
    };
  }
}
