import { SchedulerPort } from '../../domain/ports/scheduler.port.js';
import type { ScheduleRequest, SchedulingOutcome } from '../../domain/value-objects/scheduling.js';

export class FakeScheduler extends SchedulerPort {
  readonly version = 'fake-1';

  lastRequest: ScheduleRequest | null = null;

  outcome: SchedulingOutcome = {
    state: 'REVIEW',
    stability: 5,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    scheduledDays: 1,
    lastReviewAt: new Date('2026-09-22T10:00:00.000Z'),
    dueAt: new Date('2026-09-23T10:00:00.000Z'),
  };

  schedule(request: ScheduleRequest): SchedulingOutcome {
    this.lastRequest = request;
    return this.outcome;
  }
}
