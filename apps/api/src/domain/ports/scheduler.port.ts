import type { ScheduleRequest, SchedulingOutcome } from '../value-objects/scheduling.js';

/**
 * Spaced-repetition scheduler.
 *
 * Implemented in infrastructure (FSRS); the domain only knows this contract.
 */
export abstract class SchedulerPort {
  /** Identifier of the algorithm version, stored with every review state. */
  abstract readonly version: string;

  /** Next scheduling state after a rating. */
  abstract schedule(request: ScheduleRequest): SchedulingOutcome;
}
