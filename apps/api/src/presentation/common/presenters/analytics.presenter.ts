import type {
  AnalyticsOverview as AnalyticsOverviewResponse,
  ForecastResponse,
} from '@deckup/shared';

import type { ForecastRow } from '../../../domain/ports/study-analytics.repository.js';
import type { AnalyticsOverviewResult } from '../../../domain/services/study-metrics.service.js';

export function toAnalyticsOverview(result: AnalyticsOverviewResult): AnalyticsOverviewResponse {
  return {
    streak: result.streak,
    reviewsToday: result.reviewsToday,
    dueToday: result.dueToday,
    retention30d: result.retention30d,
    totalCards: result.totalCards,
    totalDecks: result.totalDecks,
  };
}

export function toForecastResponse(days: ForecastRow[]): ForecastResponse {
  return { days };
}
