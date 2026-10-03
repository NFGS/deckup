import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../../test/http';
import { renderWithProviders } from '../../test/render';
import { ExplorePage } from './explore-page';

const fetchMock = vi.fn<typeof fetch>();

const PUBLIC_DECK = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Public Biology',
  description: 'Unit 3 review',
  subject: 'Biology',
  color: null,
  visibility: 'PUBLIC',
  tags: ['unit-3'],
  cardCount: 12,
  dueCount: 0,
  authorName: 'Ana',
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:00.000Z',
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation((input) => {
    const url = requestUrl(input);

    if (url.includes('/auth/refresh')) {
      return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
    }

    if (url.includes('/clone')) {
      return Promise.resolve(jsonResponse({ ...PUBLIC_DECK, visibility: 'PRIVATE' }, 201));
    }

    if (url.includes('/decks/public')) {
      return Promise.resolve(
        jsonResponse({ items: [PUBLIC_DECK], page: 1, pageSize: 24, total: 1 }),
      );
    }

    return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ExplorePage', () => {
  it('lists public decks with their author', async () => {
    await renderWithProviders(<ExplorePage />, { route: '/explore' });

    expect(await screen.findByText('Public Biology')).toBeInTheDocument();
    expect(screen.getByText(/by Ana · Biology/i)).toBeInTheDocument();
    expect(screen.getByText('12 cards')).toBeInTheDocument();
  });

  it('clones a deck from the catalogue', async () => {
    await renderWithProviders(<ExplorePage />, { route: '/explore' });

    await screen.findByText('Public Biology');
    await userEvent.click(screen.getByRole('button', { name: /clone deck/i }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).includes('/clone'))).toBe(
        true,
      ),
    );
  });

  it('shows an empty state when nothing is public', async () => {
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);

      if (url.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
      }

      return Promise.resolve(jsonResponse({ items: [], page: 1, pageSize: 24, total: 0 }));
    });

    await renderWithProviders(<ExplorePage />, { route: '/explore' });

    expect(await screen.findByText('No public decks yet')).toBeInTheDocument();
  });
});
