import type { ReviewRating } from '@deckup/shared';

export interface QueuedReview {
  sessionId: string;
  cardId: string;
  rating: ReviewRating;
  queuedAt: string;
}

const STORAGE_KEY = 'deckup.offline-reviews';

export function readQueue(): QueuedReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

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

export function enqueueReview(review: Omit<QueuedReview, 'queuedAt'>): QueuedReview[] {
  const next = [...readQueue(), { ...review, queuedAt: new Date().toISOString() }];
  write(next);
  return next;
}

export function clearQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): nothing to clear.
  }
}

/**
 * Sends queued reviews in order. Stops at the first failure so the remaining
 * reviews stay queued for the next attempt.
 */
export async function flushQueue(send: (review: QueuedReview) => Promise<void>): Promise<number> {
  const queue = readQueue();
  let sent = 0;

  for (const review of queue) {
    try {
      await send(review);
      sent += 1;
    } catch {
      break;
    }
  }

  write(queue.slice(sent));
  return sent;
}

function write(queue: QueuedReview[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
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
    typeof candidate.sessionId === 'string' &&
    typeof candidate.cardId === 'string' &&
    typeof candidate.rating === 'string' &&
    typeof candidate.queuedAt === 'string'
  );
}
