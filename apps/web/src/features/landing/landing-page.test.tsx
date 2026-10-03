import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { LandingPage } from './landing-page';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    json: () => Promise.resolve({ title: 'Unauthorized', status: 401 }),
  } as unknown as Response);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LandingPage', () => {
  it('renders the product name and core features', async () => {
    await renderWithProviders(<LandingPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'DeckUp' })).toBeInTheDocument();
    expect(screen.getByText('Custom decks')).toBeInTheDocument();
    expect(screen.getByText('Smart scheduling')).toBeInTheDocument();
    expect(screen.getByText('Study analytics')).toBeInTheDocument();
  });

  it('offers sign-in and registration for anonymous visitors', async () => {
    await renderWithProviders(<LandingPage />);

    expect(await screen.findByRole('link', { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });
});
