import { describe, expect, it } from 'vitest';

import type { SchedulingSnapshot } from '../../domain/value-objects/scheduling.js';
import { TsFsrsScheduler } from './ts-fsrs.scheduler.js';

const NOW = new Date('2026-09-22T10:00:00.000Z');
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

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

function reviewSnapshot(overrides: Partial<SchedulingSnapshot> = {}): SchedulingSnapshot {
  return snapshot({
    state: 'REVIEW',
    stability: 5,
    difficulty: 5,
    reps: 3,
    scheduledDays: 5,
    lastReviewAt: new Date(NOW.getTime() - 5 * DAY_MS),
    ...overrides,
  });
}

describe('TsFsrsScheduler', () => {
  const scheduler = new TsFsrsScheduler();

  it('reports the FSRS version', () => {
    expect(scheduler.version).toBe('fsrs-6');
  });

  it('keeps a new card in learning when rated Again', () => {
    const outcome = scheduler.schedule({ snapshot: snapshot(), rating: 'AGAIN', now: NOW });

    expect(outcome.state).toBe('LEARNING');
    expect(outcome.reps).toBe(1);
    expect(outcome.dueAt.getTime()).toBeGreaterThan(NOW.getTime());
    expect(outcome.dueAt.getTime()).toBeLessThanOrEqual(NOW.getTime() + 10 * MINUTE_MS);
  });

  it('graduates a new card to review when rated Easy', () => {
    const outcome = scheduler.schedule({ snapshot: snapshot(), rating: 'EASY', now: NOW });

    expect(outcome.state).toBe('REVIEW');
    expect(outcome.scheduledDays).toBeGreaterThanOrEqual(1);
    expect(outcome.dueAt.getTime()).toBeGreaterThan(NOW.getTime() + 12 * 60 * MINUTE_MS);
  });

  it('schedules Easy later than Good for a new card', () => {
    const good = scheduler.schedule({ snapshot: snapshot(), rating: 'GOOD', now: NOW });
    const easy = scheduler.schedule({ snapshot: snapshot(), rating: 'EASY', now: NOW });

    expect(easy.dueAt.getTime()).toBeGreaterThan(good.dueAt.getTime());
  });

  it('graduates a learning card to review after the last learning step', () => {
    const first = scheduler.schedule({ snapshot: snapshot(), rating: 'GOOD', now: NOW });
    expect(first.state).toBe('LEARNING');
    expect(first.learningSteps).toBeGreaterThan(0);

    const second = scheduler.schedule({
      snapshot: snapshot({
        state: first.state,
        stability: first.stability,
        difficulty: first.difficulty,
        reps: first.reps,
        lapses: first.lapses,
        scheduledDays: first.scheduledDays,
        learningSteps: first.learningSteps,
        lastReviewAt: first.lastReviewAt,
        dueAt: first.dueAt,
      }),
      rating: 'GOOD',
      now: first.dueAt,
    });

    expect(second.state).toBe('REVIEW');
    expect(second.scheduledDays).toBeGreaterThanOrEqual(1);
    expect(second.dueAt.getTime()).toBeGreaterThan(first.dueAt.getTime() + 12 * 60 * MINUTE_MS);
  });

  it('keeps the learning step on a repeated Again', () => {
    const first = scheduler.schedule({ snapshot: snapshot(), rating: 'AGAIN', now: NOW });
    const second = scheduler.schedule({
      snapshot: snapshot({
        state: first.state,
        stability: first.stability,
        difficulty: first.difficulty,
        reps: first.reps,
        lapses: first.lapses,
        scheduledDays: first.scheduledDays,
        learningSteps: first.learningSteps,
        lastReviewAt: first.lastReviewAt,
        dueAt: first.dueAt,
      }),
      rating: 'AGAIN',
      now: first.dueAt,
    });

    expect(second.state).toBe('LEARNING');
    expect(second.dueAt.getTime()).toBeGreaterThan(first.dueAt.getTime());
  });

  it('grows the interval when a review card is rated Good', () => {
    const outcome = scheduler.schedule({ snapshot: reviewSnapshot(), rating: 'GOOD', now: NOW });

    expect(outcome.state).toBe('REVIEW');
    expect(outcome.reps).toBe(4);
    expect(outcome.scheduledDays).toBeGreaterThanOrEqual(5);
    expect(outcome.dueAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('records a lapse when a review card is rated Again', () => {
    const outcome = scheduler.schedule({
      snapshot: reviewSnapshot({ lapses: 1 }),
      rating: 'AGAIN',
      now: NOW,
    });

    expect(outcome.lapses).toBe(2);
    expect(['LEARNING', 'RELEARNING']).toContain(outcome.state);
  });

  it('produces finite memory values and a last review timestamp', () => {
    const outcome = scheduler.schedule({ snapshot: snapshot(), rating: 'GOOD', now: NOW });

    expect(Number.isFinite(outcome.stability)).toBe(true);
    expect(Number.isFinite(outcome.difficulty)).toBe(true);
    expect(outcome.lastReviewAt.toISOString()).toBe(NOW.toISOString());
  });
});
