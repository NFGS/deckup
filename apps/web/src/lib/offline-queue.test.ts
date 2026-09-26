import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-client';
import { clearAllQueues, enqueueReview, flushQueue, readQueue } from './offline-queue';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

const REVIEW = {
  sessionId: '33333333-3333-4333-8333-333333333333',
  cardId: '44444444-4444-4444-8444-444444444444',
  rating: 'GOOD',
  clientReviewId: '55555555-5555-4555-8555-555555555555',
} as const;

function conflict(): ApiError {
  return new ApiError(409, { type: 'about:blank', title: 'Conflict', status: 409 });
}

beforeEach(() => {
  clearAllQueues();
});

afterEach(() => {
  clearAllQueues();
  vi.restoreAllMocks();
});

describe('offline review queue', () => {
  it('starts empty', () => {
    expect(readQueue(USER_ID)).toEqual([]);
  });

  it('queues reviews with an entry id and a timestamp', () => {
    enqueueReview(USER_ID, REVIEW);
    enqueueReview(USER_ID, { ...REVIEW, rating: 'AGAIN' });

    const queue = readQueue(USER_ID);

    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({ ...REVIEW, rating: 'GOOD' });
    expect(queue[1]?.rating).toBe('AGAIN');
    expect(queue[0]?.id).toBeTruthy();
    expect(queue[0]?.queuedAt).toBeTypeOf('string');
  });

  it('keeps every student queue separate', () => {
    enqueueReview(USER_ID, REVIEW);

    expect(readQueue(USER_ID)).toHaveLength(1);
    expect(readQueue(OTHER_USER_ID)).toEqual([]);
  });

  it('ignores corrupted storage', () => {
    localStorage.setItem(`deckup.offline-reviews:${USER_ID}`, 'not-json');

    expect(readQueue(USER_ID)).toEqual([]);
  });

  it('flushes every queued review when the API accepts them', async () => {
    enqueueReview(USER_ID, REVIEW);
    enqueueReview(USER_ID, { ...REVIEW, rating: 'EASY' });
    const send = vi.fn().mockResolvedValue(undefined);

    const result = await flushQueue(USER_ID, send);

    expect(result).toEqual({ sent: 2, dropped: 0, pending: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(readQueue(USER_ID)).toEqual([]);
  });

  it('keeps the remaining reviews after a transient failure', async () => {
    enqueueReview(USER_ID, REVIEW);
    enqueueReview(USER_ID, { ...REVIEW, rating: 'EASY' });
    const send = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await flushQueue(USER_ID, send);

    expect(result).toEqual({ sent: 1, dropped: 0, pending: 1 });
    expect(readQueue(USER_ID)[0]?.rating).toBe('EASY');
  });

  it('drops a poisoned review and keeps processing the rest', async () => {
    enqueueReview(USER_ID, REVIEW);
    enqueueReview(USER_ID, { ...REVIEW, rating: 'EASY' });
    const send = vi.fn().mockRejectedValueOnce(conflict()).mockResolvedValueOnce(undefined);

    const result = await flushQueue(USER_ID, send);

    expect(result).toEqual({ sent: 1, dropped: 1, pending: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(readQueue(USER_ID)).toEqual([]);
  });

  it('does not lose a review enqueued during a flush', async () => {
    const lateReviewId = '66666666-6666-4666-8666-666666666666';
    const send = vi.fn().mockImplementation(() => {
      if (send.mock.calls.length === 1) {
        enqueueReview(USER_ID, { ...REVIEW, clientReviewId: lateReviewId });
      }

      return Promise.resolve();
    });

    enqueueReview(USER_ID, REVIEW);

    const result = await flushQueue(USER_ID, send);

    expect(result.sent).toBe(1);
    expect(readQueue(USER_ID)).toHaveLength(1);
    expect(readQueue(USER_ID)[0]?.clientReviewId).toBe(lateReviewId);
  });

  it('shares a single in-flight flush per student', async () => {
    let release: (() => void) | undefined;
    const send = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    enqueueReview(USER_ID, REVIEW);

    const first = flushQueue(USER_ID, send);
    const second = flushQueue(USER_ID, send);

    release?.();

    const [a, b] = await Promise.all([first, second]);

    expect(send).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(readQueue(USER_ID)).toEqual([]);
  });

  it('clears every queue at once', () => {
    enqueueReview(USER_ID, REVIEW);
    enqueueReview(OTHER_USER_ID, REVIEW);

    clearAllQueues();

    expect(readQueue(USER_ID)).toEqual([]);
    expect(readQueue(OTHER_USER_ID)).toEqual([]);
  });
});
