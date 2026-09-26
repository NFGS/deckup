import { Injectable } from '@nestjs/common';

import type { ReviewState } from '../../../domain/entities/review-state.entity.js';
import { ReviewStateRepositoryPort } from '../../../domain/ports/review-state.repository.js';
import { toDomainReviewState } from '../mappers/review-state.mapper.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaReviewStateRepository extends ReviewStateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByCardId(cardId: string): Promise<ReviewState | null> {
    const row = await this.prisma.reviewState.findUnique({ where: { cardId } });
    return row ? toDomainReviewState(row) : null;
  }
}
