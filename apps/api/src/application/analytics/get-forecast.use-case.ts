import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { StudyAnalyticsRepositoryPort as StudyAnalyticsRepository } from '../../domain/ports/study-analytics.repository.js';
import type {
  ForecastRow,
  StudyAnalyticsRepositoryPort,
} from '../../domain/ports/study-analytics.repository.js';
import { UserRepositoryPort as UserRepository } from '../../domain/ports/user.repository.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import { StudyMetricsService } from '../../domain/services/study-metrics.service.js';
import { localDateKey } from '../../domain/value-objects/local-date.js';

@Injectable()
export class GetForecastUseCase {
  constructor(
    @Inject(UserRepository) private readonly users: UserRepositoryPort,
    @Inject(StudyAnalyticsRepository) private readonly analytics: StudyAnalyticsRepositoryPort,
    private readonly metrics: StudyMetricsService,
  ) {}

  async execute(userId: string, days: number): Promise<ForecastRow[]> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const now = new Date();
    const rows = await this.analytics.dueByDay(userId, user.timezone, now, days);

    return this.metrics.forecast(rows, localDateKey(now, user.timezone), days);
  }
}
