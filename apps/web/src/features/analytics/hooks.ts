import { useQuery } from '@tanstack/react-query';

import { fetchAnalyticsOverview, fetchForecast } from './api';

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: fetchAnalyticsOverview,
  });
}

export function useForecast(days = 7) {
  return useQuery({
    queryKey: ['analytics', 'forecast', days],
    queryFn: () => fetchForecast(days),
  });
}
