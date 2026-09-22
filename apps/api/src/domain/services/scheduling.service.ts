import type { ReviewRating } from '@deckup/shared';

import { ValidationError } from '../errors/domain-errors.js';
import type { SchedulerPort } from '../ports/scheduler.port.js';
import type { SchedulingOutcome, SchedulingSnapshot } from '../value-objects/scheduling.js';

/**
 * Domain policy around spaced repetition.
 *
 * The interval mathematics live behind {@link SchedulerPort}; this service owns
 * the rules the product cares about: which ratings are valid and that every
 * outcome carries usable memory values and a valid due date.
 */
export class SchedulingService {
  constructor(private readonly scheduler: SchedulerPort) {}

  get schedulerVersion(): string {
    return this.scheduler.version;
  }

  applyRating(snapshot: SchedulingSnapshot, rating: ReviewRating, now: Date): SchedulingOutcome {
    const outcome = this.scheduler.schedule({ snapshot, rating, now });

    if (Number.isNaN(outcome.dueAt.getTime())) {
      throw new ValidationError('The scheduler produced an invalid due date');
    }

    if (outcome.stability < 0 || outcome.difficulty < 0) {
      throw new ValidationError('The scheduler produced negative memory values');
    }

    if (outcome.dueAt.getTime() < now.getTime()) {
      throw new ValidationError('The scheduler produced a due date in the past');
    }

    return outcome;
  }
}
