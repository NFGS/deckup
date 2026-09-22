import { Injectable } from '@nestjs/common';

import type { ReviewLog } from '../../../domain/entities/review-log.entity.js';
import { ReviewLogRepositoryPort } from '../../../domain/ports/review-log.repository.js';
import { toReviewLogData } from '../mappers/review-log.mapper.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaReviewLogRepository extends ReviewLogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(log: ReviewLog): Promise<void> {
    await this.prisma.reviewLog.create({ data: toReviewLogData(log) });
  }
}
