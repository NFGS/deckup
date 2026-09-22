import { analyticsOverviewSchema, forecastResponseSchema } from '@deckup/shared';
import type { AnalyticsOverview, ForecastResponse } from '@deckup/shared';

import { apiRequest } from '../../lib/api-client';

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  return apiRequest('/analytics/overview', { schema: analyticsOverviewSchema });
}

export async function fetchForecast(days = 7): Promise<ForecastResponse> {
  return apiRequest(`/analytics/forecast?days=${days}`, { schema: forecastResponseSchema });
}
