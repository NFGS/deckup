import { Injectable } from '@nestjs/common';
import type { StudyMode } from '@deckup/shared';

import { StudyQueueRepositoryPort } from '../../../domain/ports/study-queue.repository.js';
import type { StudyQueueEntry } from '../../../domain/ports/study-queue.repository.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { toDomainCard } from '../mappers/card.mapper.js';
import { toDomainReviewState } from '../mappers/review-state.mapper.js';
import { PrismaService } from '../prisma.service.js';

const CARD_INCLUDE = {
  reviewState: true,
  cardTags: { include: { tag: true } },
} as const;

@Injectable()
export class PrismaStudyQueueRepository extends StudyQueueRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(
    deckId: string,
    mode: StudyMode,
    now: Date,
    limit: number,
  ): Promise<StudyQueueEntry[]> {
    const rows = await this.prisma.card.findMany({
      where: buildQueueWhere(deckId, mode, now),
      include: CARD_INCLUDE,
      orderBy: [{ reviewState: { dueAt: 'asc' } }, { createdAt: 'asc' }],
      take: limit,
    });

    return rows.map((row) => ({
      card: toDomainCard(row),
      state: row.reviewState ? toDomainReviewState(row.reviewState) : null,
    }));
  }

  async count(deckId: string, mode: StudyMode, now: Date): Promise<number> {
    return this.prisma.card.count({ where: buildQueueWhere(deckId, mode, now) });
  }
}

function buildQueueWhere(deckId: string, mode: StudyMode, now: Date): Prisma.CardWhereInput {
  const base: Prisma.CardWhereInput = { deckId, deletedAt: null };

  if (mode === 'AHEAD') {
    return { ...base, reviewState: { is: { dueAt: { gt: now } } } };
  }

  if (mode === 'ALL') {
    return base;
  }

  return {
    ...base,
    OR: [{ reviewState: { is: null } }, { reviewState: { dueAt: { lte: now } } }],
  };
}
