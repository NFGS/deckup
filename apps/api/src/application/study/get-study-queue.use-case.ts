import { Inject, Injectable } from '@nestjs/common';

import { ConflictError, NotFoundError } from '../../domain/errors/domain-errors.js';
import { StudyQueueRepositoryPort as StudyQueueRepository } from '../../domain/ports/study-queue.repository.js';
import type {
  StudyQueueEntry,
  StudyQueueRepositoryPort,
} from '../../domain/ports/study-queue.repository.js';
import { StudySessionRepositoryPort as StudySessionRepository } from '../../domain/ports/study-session.repository.js';
import type { StudySessionRepositoryPort } from '../../domain/ports/study-session.repository.js';

export const QUEUE_LIMIT = 50;

export interface StudyQueueResult {
  sessionId: string;
  entries: StudyQueueEntry[];
  remaining: number;
}

@Injectable()
export class GetStudyQueueUseCase {
  constructor(
    @Inject(StudySessionRepository) private readonly sessions: StudySessionRepositoryPort,
    @Inject(StudyQueueRepository) private readonly queue: StudyQueueRepositoryPort,
  ) {}

  async execute(sessionId: string, userId: string): Promise<StudyQueueResult> {
    const session = await this.sessions.findByIdForUser(sessionId, userId);
    if (!session) {
      throw new NotFoundError('Study session', sessionId);
    }

    if (!session.isActive) {
      throw new ConflictError('The study session is no longer active');
    }

    const now = new Date();
    const [entries, remaining] = await Promise.all([
      this.queue.list(session.deckId, session.mode, now, QUEUE_LIMIT),
      this.queue.count(session.deckId, session.mode, now),
    ]);

    return { sessionId: session.id, entries, remaining };
  }
}
