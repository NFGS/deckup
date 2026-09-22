import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../../test/http';
import { renderWithProviders } from '../../test/render';
import { clearQueue, readQueue } from '../../lib/offline-queue';
import { StudySessionPage } from './study-session-page';

const DECK_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '33333333-3333-4333-8333-333333333333';

const fetchMock = vi.fn<typeof fetch>();

const QUEUE = {
  sessionId: SESSION_ID,
  items: [
    {
      cardId: '44444444-4444-4444-8444-444444444444',
      front: 'What is mitosis?',
      back: 'Cell division',
      hint: 'Think about the nucleus',
      imageUrl: 'https://cdn.test/mitosis.png',
      state: 'NEW',
      dueAt: '2026-09-22T10:00:00.000Z',
      isNew: true,
    },
    {
      cardId: '55555555-5555-4555-8555-555555555555',
      front: 'What is osmosis?',
      back: 'Water diffusion',
      hint: null,
      imageUrl: null,
      state: 'NEW',
      dueAt: '2026-09-22T10:00:00.000Z',
      isNew: true,
    },
  ],
  remaining: 2,
};

beforeEach(() => {
  clearQueue();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);

  fetchMock.mockImplementation((input) => {
    const url = requestUrl(input);

    if (url.includes('/auth/refresh')) {
      return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
    }

    if (url.endsWith('/study-sessions') || url.includes('/study-sessions?')) {
      return Promise.resolve(
        jsonResponse({
          id: SESSION_ID,
          deckId: DECK_ID,
          mode: 'DUE',
          status: 'ACTIVE',
          startedAt: '2026-09-22T10:00:00.000Z',
          endedAt: null,
          cardsReviewed: 0,
          correctCount: 0,
        }),
      );
    }

    if (url.includes('/queue')) {
      return Promise.resolve(jsonResponse(QUEUE));
    }

    if (url.includes('/reviews')) {
      return Promise.resolve(
        jsonResponse({
          cardId: '44444444-4444-4444-8444-444444444444',
          rating: 'GOOD',
          nextDueAt: '2026-09-22T10:10:00.000Z',
          scheduledDays: 0,
          state: 'LEARNING',
          remaining: 1,
        }),
      );
    }

    if (url.includes('/complete')) {
      return Promise.resolve(
        jsonResponse({
          sessionId: SESSION_ID,
          cardsReviewed: 2,
          correctCount: 1,
          accuracy: 0.5,
          elapsedSeconds: 95,
        }),
      );
    }

    return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
  });
});

afterEach(() => {
  clearQueue();
  vi.unstubAllGlobals();
});

function renderStudyPage() {
  return renderWithProviders(<StudySessionPage />, {
    route: `/decks/${DECK_ID}/study`,
    path: '/decks/:deckId/study',
  });
}

describe('StudySessionPage', () => {
  it('walks through the queue and shows the session summary', async () => {
    renderStudyPage();

    expect(await screen.findByText('What is mitosis?')).toBeInTheDocument();
    expect(screen.getByText('Hint: Think about the nucleus')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('Cell division')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /good/i }));
    expect(await screen.findByText('What is osmosis?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /again/i }));

    await userEvent.click(await screen.findByRole('button', { name: /finish session/i }));

    expect(await screen.findByText('Session complete')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/1m 35s/)).toBeInTheDocument();
  });

  it('renders the card image when the card has one', async () => {
    renderStudyPage();

    expect(await screen.findByText('What is mitosis?')).toBeInTheDocument();

    const image = screen.getByRole('img', { name: /image of the card what is mitosis/i });

    expect(image).toHaveAttribute('src', 'https://cdn.test/mitosis.png');
  });

  it('supports the keyboard shortcuts for flipping and rating', async () => {
    renderStudyPage();

    expect(await screen.findByText('What is mitosis?')).toBeInTheDocument();

    await userEvent.keyboard(' ');
    expect(screen.getByText('Cell division')).toBeInTheDocument();

    await userEvent.keyboard('3');
    expect(await screen.findByText('What is osmosis?')).toBeInTheDocument();
  });

  it('offers review-ahead options when nothing is due', async () => {
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);

      if (url.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
      }

      if (url.endsWith('/study-sessions') || url.includes('/study-sessions?')) {
        return Promise.resolve(
          jsonResponse({
            id: SESSION_ID,
            deckId: DECK_ID,
            mode: 'DUE',
            status: 'ACTIVE',
            startedAt: '2026-09-22T10:00:00.000Z',
            endedAt: null,
            cardsReviewed: 0,
            correctCount: 0,
          }),
        );
      }

      if (url.includes('/queue')) {
        return Promise.resolve(jsonResponse({ sessionId: SESSION_ID, items: [], remaining: 0 }));
      }

      return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
    });

    renderStudyPage();

    expect(await screen.findByText('Nothing is due right now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review ahead/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review all cards/i })).toBeInTheDocument();
  });

  it('queues the review on this device when the network fails', async () => {
    fetchMock.mockImplementation((input) => {
      const url = requestUrl(input);

      if (url.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
      }

      if (url.includes('/reviews')) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }

      if (url.endsWith('/study-sessions') || url.includes('/study-sessions?')) {
        return Promise.resolve(
          jsonResponse({
            id: SESSION_ID,
            deckId: DECK_ID,
            mode: 'DUE',
            status: 'ACTIVE',
            startedAt: '2026-09-22T10:00:00.000Z',
            endedAt: null,
            cardsReviewed: 0,
            correctCount: 0,
          }),
        );
      }

      if (url.includes('/queue')) {
        return Promise.resolve(jsonResponse(QUEUE));
      }

      return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
    });

    renderStudyPage();

    expect(await screen.findByText('What is mitosis?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /good/i }));

    expect(await screen.findByText(/saved on this device/i)).toBeInTheDocument();
    expect(await screen.findByText('What is osmosis?')).toBeInTheDocument();
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]?.clientReviewId).toBeTruthy();
  });
});
