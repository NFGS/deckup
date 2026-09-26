import type { ReviewLog } from '../entities/review-log.entity.js';
import type { ReviewState } from '../entities/review-state.entity.js';
import type { StudySession } from '../entities/study-session.entity.js';

export interface ReviewRecording {
  state: ReviewState;
  log: ReviewLog;
  session: StudySession;
  /** Version of the persisted state before this review; `0` when it does not exist yet. */
  expectedVersion: number;
}

export type ReviewRecordingResult =
  { status: 'recorded' } | { status: 'stale' } | { status: 'duplicate' };

/**
 * Atomically persists everything produced by a review: the new scheduling
 * state, the immutable review log and the session counters (NFR-04.2).
 *
 * The write is guarded by an optimistic version check; a concurrent writer
 * yields `stale` so the caller can recompute, and a repeated idempotency key
 * yields `duplicate` so the caller can replay the stored result.
 */
export abstract class ReviewRecorderPort {
  abstract record(recording: ReviewRecording): Promise<ReviewRecordingResult>;
}
