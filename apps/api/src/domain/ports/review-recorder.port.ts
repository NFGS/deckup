import type { ReviewLog } from '../entities/review-log.entity.js';
import type { ReviewState } from '../entities/review-state.entity.js';
import type { StudySession } from '../entities/study-session.entity.js';

export interface ReviewRecording {
  state: ReviewState;
  log: ReviewLog;
  session: StudySession;
}

/**
 * Atomically persists everything produced by a review: the new scheduling
 * state, the immutable review log and the session counters (NFR-04.2).
 */
export abstract class ReviewRecorderPort {
  abstract record(recording: ReviewRecording): Promise<void>;
}
