import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../../test/http';
import { renderWithProviders } from '../../test/render';
import { AnalyticsPage } from './analytics-page';

const fetchMock = vi.fn<typeof fetch>();

const FORECAST = {
  days: [
    { date: '2026-09-22', dueCount: 7 },
    { date: '2026-09-23', dueCount: 3 },
    { date: '2026-09-24', dueCount: 0 },
    { date: '2026-09-25', dueCount: 12 },
    { date: '2026-09-26', dueCount: 5 },
    { date: '2026-09-27', dueCount: 0 },
    { date: '2026-09-28', dueCount: 9 },
  ],
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation((input) => {
    const url = requestUrl(input);

    if (url.includes('/auth/refresh')) {
      return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
    }

    if (url.includes('/analytics/overview')) {
      return Promise.resolve(
        jsonResponse({
          streak: 12,
          reviewsToday: 24,
          dueToday: 7,
          retention30d: 0.87,
          totalCards: 150,
          totalDecks: 4,
        }),
      );
    }

    if (url.includes('/analytics/forecast')) {
      return Promise.resolve(jsonResponse(FORECAST));
    }

    return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AnalyticsPage', () => {
  it('renders the study metrics', async () => {
    await renderWithProviders(<AnalyticsPage />, { route: '/analytics' });

    expect(await screen.findByText('12 days')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders the workload forecast section', async () => {
    await renderWithProviders(<AnalyticsPage />, { route: '/analytics' });

    expect(await screen.findByText('Next 7 days')).toBeInTheDocument();
    expect(screen.getByText(/cards expected to come due/i)).toBeInTheDocument();
  });

  it('shows an empty state when the API fails', async () => {
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);

      if (url.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
      }

      return Promise.resolve(jsonResponse({ title: 'Server error', status: 500 }, 500));
    });

    await renderWithProviders(<AnalyticsPage />, { route: '/analytics' });

    expect(await screen.findByText(/could not load your analytics/i)).toBeInTheDocument();
  });
});
