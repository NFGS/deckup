import type { ReviewRating } from '@deckup/shared';

import { ApiError } from './api-client';

export interface QueuedReview {
  /** Unique entry id, so a concurrent flush never drops a newer review. */
  id: string;
  sessionId: string;
  cardId: string;
  rating: ReviewRating;
  /** Stable id so replaying the same review twice is a no-op on the server. */
  clientReviewId: string;
  queuedAt: string;
}

export interface FlushResult {
  sent: number;
  dropped: number;
  pending: number;
}

const STORAGE_PREFIX = 'deckup.offline-reviews';
const RETRYABLE_STATUSES = [408, 425, 429];

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function readQueue(userId: string): QueuedReview[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isQueuedReview);
  } catch {
    return [];
  }
}

export function enqueueReview(
  userId: string,
  review: Omit<QueuedReview, 'id' | 'queuedAt'>,
): QueuedReview[] {
  const next = [
    ...readQueue(userId),
    { ...review, id: createId(), queuedAt: new Date().toISOString() },
  ];

  write(userId, next);
  return next;
}

export function removeQueuedReview(userId: string, id: string): QueuedReview[] {
  const next = readQueue(userId).filter((entry) => entry.id !== id);
  write(userId, next);
  return next;
}

export function clearQueue(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Storage unavailable (private mode): nothing to clear.
  }
}

/** Removes every queue, including the pre-scoping legacy key. */
export function clearAllQueues(): void {
  try {
    const keys: string[] = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

const inFlight = new Map<string, Promise<FlushResult>>();

/**
 * Sends the queued reviews of one student in order.
 *
 * Transient failures (network errors, 5xx, 408/425/429) keep the entry and
 * stop the flush so it can be retried; permanent failures (other 4xx) drop the
 * entry so a single poisoned review cannot block the queue forever. Concurrent
 * callers share the same in-flight flush.
 */
export function flushQueue(
  userId: string,
  send: (review: QueuedReview) => Promise<void>,
): Promise<FlushResult> {
  const running = inFlight.get(userId);

  if (running) {
    return running;
  }

  const promise = performFlush(userId, send).finally(() => inFlight.delete(userId));
  inFlight.set(userId, promise);

  return promise;
}

async function performFlush(
  userId: string,
  send: (review: QueuedReview) => Promise<void>,
): Promise<FlushResult> {
  let sent = 0;
  let dropped = 0;

  for (const review of readQueue(userId)) {
    try {
      await send(review);
      sent += 1;
      removeQueuedReview(userId, review.id);
    } catch (error) {
      if (!isPermanentFailure(error)) {
        break;
      }

      dropped += 1;
      removeQueuedReview(userId, review.id);
    }
  }

  return { sent, dropped, pending: readQueue(userId).length };
}

function isPermanentFailure(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    !RETRYABLE_STATUSES.includes(error.status)
  );
}

export function createClientReviewId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

function createId(): string {
  return createClientReviewId();
}

function write(userId: string, queue: QueuedReview[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(storageKey(userId));
      return;
    }

    localStorage.setItem(storageKey(userId), JSON.stringify(queue));
  } catch {
    // Storage unavailable: the review stays only in memory for this session.
  }
}

function isQueuedReview(value: unknown): value is QueuedReview {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<QueuedReview>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.sessionId === 'string' &&
    typeof candidate.cardId === 'string' &&
    typeof candidate.rating === 'string' &&
    typeof candidate.clientReviewId === 'string' &&
    typeof candidate.queuedAt === 'string'
  );
}
