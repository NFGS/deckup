import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../../test/http';
import { renderWithProviders } from '../../test/render';
import { ImportCardsModal } from './import-cards-modal';

const DECK_ID = '22222222-2222-4222-8222-222222222222';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation((input) => {
    const url = requestUrl(input);

    if (url.includes('/auth/refresh')) {
      return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
    }

    if (url.includes('/import')) {
      return Promise.resolve(
        jsonResponse({
          imported: 2,
          skipped: 1,
          errors: [{ row: 4, message: 'Card front must be between 1 and 2000 characters' }],
        }),
      );
    }

    return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ImportCardsModal', () => {
  it('uploads the file and shows the import summary', async () => {
    await renderWithProviders(<ImportCardsModal deckId={DECK_ID} open onClose={vi.fn()} />);

    const file = new File(['front,back\nQ1,A1'], 'cards.csv', { type: 'text/csv' });

    await userEvent.upload(screen.getByLabelText('CSV file'), file);
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/2 cards imported · 1 skipped/i)).toBeInTheDocument();
    expect(screen.getByText(/row 4/i)).toBeInTheDocument();

    const importCall = fetchMock.mock.calls.find(([input]) =>
      requestUrl(input).includes('/import'),
    );

    expect(importCall?.[1]?.body).toBeInstanceOf(FormData);
  });

  it('requires a file before importing', async () => {
    await renderWithProviders(<ImportCardsModal deckId={DECK_ID} open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/choose a csv file first/i)).toBeInTheDocument();
  });

  it('surfaces API errors', async () => {
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);

      if (url.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
      }

      return Promise.resolve(
        jsonResponse(
          {
            title: 'Validation failed',
            status: 422,
            detail: "The CSV file must contain a 'back' column",
          },
          422,
        ),
      );
    });

    await renderWithProviders(<ImportCardsModal deckId={DECK_ID} open onClose={vi.fn()} />);

    const file = new File(['front\nQ1'], 'cards.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('CSV file'), file);
    await userEvent.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText(/must contain a 'back' column/i)).toBeInTheDocument();
  });
});
