import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearQueue, enqueueReview, flushQueue, readQueue } from './offline-queue';

const REVIEW = {
  sessionId: '33333333-3333-4333-8333-333333333333',
  cardId: '44444444-4444-4444-8444-444444444444',
  rating: 'GOOD',
} as const;

beforeEach(() => {
  clearQueue();
});

afterEach(() => {
  clearQueue();
  vi.restoreAllMocks();
});

describe('offline review queue', () => {
  it('starts empty', () => {
    expect(readQueue()).toEqual([]);
  });

  it('queues reviews with a timestamp', () => {
    enqueueReview(REVIEW);
    enqueueReview({ ...REVIEW, rating: 'AGAIN' });

    const queue = readQueue();

    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({ ...REVIEW, rating: 'GOOD' });
    expect(queue[1]?.rating).toBe('AGAIN');
    expect(queue[0]?.queuedAt).toBeTypeOf('string');
  });

  it('ignores corrupted storage', () => {
    localStorage.setItem('deckup.offline-reviews', 'not-json');

    expect(readQueue()).toEqual([]);
  });

  it('flushes every queued review when the API accepts them', async () => {
    enqueueReview(REVIEW);
    enqueueReview({ ...REVIEW, rating: 'EASY' });
    const send = vi.fn().mockResolvedValue(undefined);

    const sent = await flushQueue(send);

    expect(sent).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect(readQueue()).toEqual([]);
  });

  it('keeps the remaining reviews when the API fails', async () => {
    enqueueReview(REVIEW);
    enqueueReview({ ...REVIEW, rating: 'EASY' });
    const send = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('offline'));

    const sent = await flushQueue(send);

    expect(sent).toBe(1);
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]?.rating).toBe('EASY');
  });
});
