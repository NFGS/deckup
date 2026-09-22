import { Inject, Injectable } from '@nestjs/common';

import type { StudySession } from '../../domain/entities/study-session.entity.js';
import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { StudySessionRepositoryPort as StudySessionRepository } from '../../domain/ports/study-session.repository.js';
import type { StudySessionRepositoryPort } from '../../domain/ports/study-session.repository.js';

@Injectable()
export class AbandonStudySessionUseCase {
  constructor(
    @Inject(StudySessionRepository) private readonly sessions: StudySessionRepositoryPort,
  ) {}

  async execute(sessionId: string, userId: string): Promise<StudySession> {
    const session = await this.sessions.findByIdForUser(sessionId, userId);

    if (!session) {
      throw new NotFoundError('Study session', sessionId);
    }

    const abandoned = session.abandon();
    await this.sessions.update(abandoned);

    return abandoned;
  }
}
