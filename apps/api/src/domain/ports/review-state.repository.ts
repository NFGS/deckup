import type { ReviewState } from '../entities/review-state.entity.js';

export abstract class ReviewStateRepositoryPort {
  abstract findByCardId(cardId: string): Promise<ReviewState | null>;
  abstract upsert(state: ReviewState): Promise<void>;
}
