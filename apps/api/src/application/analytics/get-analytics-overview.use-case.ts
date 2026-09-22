import { Inject, Injectable } from '@nestjs/common';
import { isValidTimeZone } from '@deckup/shared';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { StudyAnalyticsRepositoryPort as StudyAnalyticsRepository } from '../../domain/ports/study-analytics.repository.js';
import type { StudyAnalyticsRepositoryPort } from '../../domain/ports/study-analytics.repository.js';
import { UserRepositoryPort as UserRepository } from '../../domain/ports/user.repository.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import { StudyMetricsService } from '../../domain/services/study-metrics.service.js';
import type { AnalyticsOverviewResult } from '../../domain/services/study-metrics.service.js';
import { localDateKey } from '../../domain/value-objects/local-date.js';

export const RETENTION_WINDOW_DAYS = 30;

@Injectable()
export class GetAnalyticsOverviewUseCase {
  constructor(
    @Inject(UserRepository) private readonly users: UserRepositoryPort,
    @Inject(StudyAnalyticsRepository) private readonly analytics: StudyAnalyticsRepositoryPort,
    private readonly metrics: StudyMetricsService,
  ) {}

  async execute(userId: string): Promise<AnalyticsOverviewResult> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const now = new Date();
    const timezone = isValidTimeZone(user.timezone) ? user.timezone : 'UTC';
    const snapshot = await this.analytics.snapshot(userId, timezone, now, RETENTION_WINDOW_DAYS);

    return this.metrics.overview(snapshot, localDateKey(now, timezone));
  }
}
