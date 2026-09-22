import type { ReviewLog } from '../entities/review-log.entity.js';

export abstract class ReviewLogRepositoryPort {
  abstract create(log: ReviewLog): Promise<void>;

  /** Used to make offline review replay idempotent (NFR-04.2). */
  abstract findByClientReviewId(
    sessionId: string,
    clientReviewId: string,
  ): Promise<ReviewLog | null>;
}
