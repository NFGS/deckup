import type { ReviewLog } from '../entities/review-log.entity.js';

export abstract class ReviewLogRepositoryPort {
  abstract create(log: ReviewLog): Promise<void>;
}
