import { Controller, Get, Query } from '@nestjs/common';
import { forecastQuerySchema } from '@deckup/shared';
import type {
  AccessTokenPayload,
  AnalyticsOverview,
  ForecastQuery,
  ForecastResponse,
} from '@deckup/shared';

import { GetAnalyticsOverviewUseCase } from '../application/analytics/get-analytics-overview.use-case.js';
import { GetForecastUseCase } from '../application/analytics/get-forecast.use-case.js';
import { CurrentUser } from './common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import {
  toAnalyticsOverview,
  toForecastResponse,
} from './common/presenters/analytics.presenter.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly getOverview: GetAnalyticsOverviewUseCase,
    private readonly getForecast: GetForecastUseCase,
  ) {}

  @Get('overview')
  async overview(@CurrentUser() user: AccessTokenPayload): Promise<AnalyticsOverview> {
    return toAnalyticsOverview(await this.getOverview.execute(user.sub));
  }

  @Get('forecast')
  async forecast(
    @CurrentUser() user: AccessTokenPayload,
    @Query(new ZodValidationPipe(forecastQuerySchema)) query: ForecastQuery,
  ): Promise<ForecastResponse> {
    return toForecastResponse(await this.getForecast.execute(user.sub, query.days));
  }
}
