import { Injectable } from '@nestjs/common';
import type { StudyMode } from '@deckup/shared';

import type { StudySession } from '../../../domain/entities/study-session.entity.js';
import { StudySessionRepositoryPort } from '../../../domain/ports/study-session.repository.js';
import { toDomainStudySession, toStudySessionData } from '../mappers/study-session.mapper.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaStudySessionRepository extends StudySessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(session: StudySession): Promise<void> {
    await this.prisma.studySession.create({
      data: {
        id: session.id,
        userId: session.userId,
        deckId: session.deckId,
        startedAt: session.startedAt,
        ...toStudySessionData(session),
      },
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<StudySession | null> {
    const row = await this.prisma.studySession.findFirst({ where: { id, userId } });
    return row ? toDomainStudySession(row) : null;
  }

  async findActiveForDeck(
    userId: string,
    deckId: string,
    mode: StudyMode,
  ): Promise<StudySession | null> {
    const row = await this.prisma.studySession.findFirst({
      where: { userId, deckId, mode, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
    });

    return row ? toDomainStudySession(row) : null;
  }

  async update(session: StudySession): Promise<void> {
    await this.prisma.studySession.update({
      where: { id: session.id },
      data: toStudySessionData(session),
    });
  }
}
