import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../../test/http';
import { renderWithProviders } from '../../test/render';
import { GenerateCardsModal } from './generate-cards-modal';

const fetchMock = vi.fn<typeof fetch>();

const SUGGESTIONS = {
  suggestions: [
    { front: 'What is mitosis?', back: 'Cell division', hint: null },
    { front: 'What is osmosis?', back: 'Water diffusion', hint: 'Think about membranes' },
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

    if (url.includes('/ai/card-suggestions')) {
      return Promise.resolve(jsonResponse(SUGGESTIONS));
    }

    return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const NOTES = 'Mitosis is a type of cell division that produces two identical daughter cells.';

describe('GenerateCardsModal', () => {
  it('generates suggestions and adds the selected ones', async () => {
    const onAddCards = vi.fn().mockResolvedValue(undefined);

    await renderWithProviders(
      <GenerateCardsModal open onClose={vi.fn()} onAddCards={onAddCards} />,
    );

    await userEvent.type(screen.getByLabelText('Study notes'), NOTES);
    await userEvent.click(screen.getByRole('button', { name: /generate suggestions/i }));

    expect(await screen.findByText('What is mitosis?')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /add selected \(2\)/i }));

    await waitFor(() => expect(onAddCards).toHaveBeenCalledTimes(1));
    expect(onAddCards).toHaveBeenCalledWith([
      { front: 'What is mitosis?', back: 'Cell division', hint: undefined },
      { front: 'What is osmosis?', back: 'Water diffusion', hint: 'Think about membranes' },
    ]);
  });

  it('lets the student deselect suggestions', async () => {
    const onAddCards = vi.fn().mockResolvedValue(undefined);

    await renderWithProviders(
      <GenerateCardsModal open onClose={vi.fn()} onAddCards={onAddCards} />,
    );

    await userEvent.type(screen.getByLabelText('Study notes'), NOTES);
    await userEvent.click(screen.getByRole('button', { name: /generate suggestions/i }));
    await screen.findByText('What is mitosis?');

    await userEvent.click(screen.getByLabelText('Use suggestion 2'));
    await userEvent.click(screen.getByRole('button', { name: /add selected \(1\)/i }));

    await waitFor(() => expect(onAddCards).toHaveBeenCalledTimes(1));
    expect(onAddCards).toHaveBeenCalledWith([
      { front: 'What is mitosis?', back: 'Cell division', hint: undefined },
    ]);
  });

  it('keeps the generate button disabled until the notes are long enough', async () => {
    await renderWithProviders(<GenerateCardsModal open onClose={vi.fn()} onAddCards={vi.fn()} />);

    expect(screen.getByRole('button', { name: /generate suggestions/i })).toBeDisabled();
  });

  it('surfaces a disabled provider', async () => {
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);

      if (url.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
      }

      return Promise.resolve(
        jsonResponse(
          {
            title: 'Service unavailable',
            status: 503,
            detail: 'AI card generation is not configured on this deployment',
          },
          503,
        ),
      );
    });

    await renderWithProviders(<GenerateCardsModal open onClose={vi.fn()} onAddCards={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Study notes'), NOTES);
    await userEvent.click(screen.getByRole('button', { name: /generate suggestions/i }));

    expect(await screen.findByText(/not configured on this deployment/i)).toBeInTheDocument();
  });
});
