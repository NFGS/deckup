import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-errors.js';
import { SchedulingService } from './scheduling.service.js';
import { FakeScheduler } from '../../testing/fakes/fake-scheduler.fake.js';
import type { SchedulingSnapshot } from '../value-objects/scheduling.js';

const NOW = new Date('2026-09-22T10:00:00.000Z');

function snapshot(overrides: Partial<SchedulingSnapshot> = {}): SchedulingSnapshot {
  return {
    state: 'NEW',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    scheduledDays: 0,
    learningSteps: 0,
    lastReviewAt: null,
    dueAt: NOW,
    ...overrides,
  };
}

describe('SchedulingService', () => {
  it('exposes the scheduler version', () => {
    const service = new SchedulingService(new FakeScheduler());

    expect(service.schedulerVersion).toBe('fake-1');
  });

  it('delegates the rating to the scheduler port', () => {
    const scheduler = new FakeScheduler();
    const service = new SchedulingService(scheduler);
    const current = snapshot();

    const outcome = service.applyRating(current, 'GOOD', NOW);

    expect(outcome).toBe(scheduler.outcome);
    expect(scheduler.lastRequest).toEqual({ snapshot: current, rating: 'GOOD', now: NOW });
  });

  it('rejects an invalid due date produced by the scheduler', () => {
    const scheduler = new FakeScheduler();
    scheduler.outcome = { ...scheduler.outcome, dueAt: new Date('invalid') };
    const service = new SchedulingService(scheduler);

    expect(() => service.applyRating(snapshot(), 'GOOD', NOW)).toThrow(ValidationError);
  });

  it('rejects a due date in the past', () => {
    const scheduler = new FakeScheduler();
    scheduler.outcome = { ...scheduler.outcome, dueAt: new Date(NOW.getTime() - 60_000) };
    const service = new SchedulingService(scheduler);

    expect(() => service.applyRating(snapshot(), 'GOOD', NOW)).toThrow(ValidationError);
  });

  it('rejects negative memory values', () => {
    const scheduler = new FakeScheduler();
    scheduler.outcome = { ...scheduler.outcome, stability: -1 };
    const service = new SchedulingService(scheduler);

    expect(() => service.applyRating(snapshot(), 'GOOD', NOW)).toThrow(ValidationError);
  });
});
