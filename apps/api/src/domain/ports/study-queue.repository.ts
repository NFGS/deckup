import type { StudyMode } from '@deckup/shared';

import type { Card } from '../entities/card.entity.js';
import type { ReviewState } from '../entities/review-state.entity.js';

export interface StudyQueueEntry {
  card: Card;
  state: ReviewState | null;
}

/**
 * Read model for the daily study queue.
 */
export abstract class StudyQueueRepositoryPort {
  abstract list(
    deckId: string,
    mode: StudyMode,
    now: Date,
    limit: number,
  ): Promise<StudyQueueEntry[]>;

  abstract count(deckId: string, mode: StudyMode, now: Date): Promise<number>;
}
