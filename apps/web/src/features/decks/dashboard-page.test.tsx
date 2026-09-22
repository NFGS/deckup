import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../../test/http';
import { renderWithProviders } from '../../test/render';
import { DashboardPage } from './dashboard-page';

const BIOLOGY_DECK = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Biology deck',
  description: null,
  subject: 'Biology',
  color: null,
  visibility: 'PRIVATE',
  tags: [],
  cardCount: 2,
  dueCount: 1,
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:00.000Z',
};

const HISTORY_DECK = {
  ...BIOLOGY_DECK,
  id: '22222222-2222-4222-8222-222222222222',
  title: 'History deck',
  subject: 'History',
};

const fetchMock = vi.fn<typeof fetch>();

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
          streak: 3,
          reviewsToday: 0,
          dueToday: 1,
          retention30d: 0,
          totalCards: 2,
          totalDecks: 2,
        }),
      );
    }

    if (url.includes('/decks')) {
      const subject = new URL(url, 'http://localhost').searchParams.get('subject');
      const items = subject === 'Biology' ? [BIOLOGY_DECK] : [BIOLOGY_DECK, HISTORY_DECK];

      return Promise.resolve(jsonResponse({ items, page: 1, pageSize: 24, total: items.length }));
    }

    return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DashboardPage', () => {
  it('shows the streak and filters decks by subject', async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Biology deck')).toBeInTheDocument();
    expect(screen.getByText('History deck')).toBeInTheDocument();
    expect(await screen.findByText('3 day streak')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Filter by subject'), 'Biology');

    await waitFor(() => {
      expect(screen.queryByText('History deck')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Biology deck')).toBeInTheDocument();

    const filteredCall = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes('subject=Biology'),
    );

    expect(filteredCall).toBeDefined();
  });
});
