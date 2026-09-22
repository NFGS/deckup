import { Module } from '@nestjs/common';

import { GetAnalyticsOverviewUseCase } from './application/analytics/get-analytics-overview.use-case.js';
import { GetForecastUseCase } from './application/analytics/get-forecast.use-case.js';
import { StudyMetricsService } from './domain/services/study-metrics.service.js';
import { AnalyticsController } from './presentation/analytics.controller.js';

@Module({
  controllers: [AnalyticsController],
  providers: [
    GetAnalyticsOverviewUseCase,
    GetForecastUseCase,
    { provide: StudyMetricsService, useFactory: () => new StudyMetricsService() },
  ],
})
export class AnalyticsModule {}
