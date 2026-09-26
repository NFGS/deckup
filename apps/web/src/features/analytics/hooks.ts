import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../lib/query-keys';
import { fetchAnalyticsOverview, fetchForecast } from './api';

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: queryKeys.analytics.overview,
    queryFn: fetchAnalyticsOverview,
  });
}

export function useForecast(days = 7) {
  return useQuery({
    queryKey: queryKeys.analytics.forecast(days),
    queryFn: () => fetchForecast(days),
  });
}
