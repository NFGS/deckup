import { describe, expect, it } from 'vitest';

import { ReviewState } from './review-state.entity.js';

const CARD_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-09-22T10:00:00.000Z');

function newState(): ReviewState {
  return ReviewState.createNew({
    cardId: CARD_ID,
    userId: USER_ID,
    schedulerVersion: 'fsrs-6',
    now: NOW,
  });
}

describe('ReviewState', () => {
  it('creates a new card due immediately', () => {
    const state = newState();

    expect(state.state).toBe('NEW');
    expect(state.isNew).toBe(true);
    expect(state.dueAt.toISOString()).toBe(NOW.toISOString());
    expect(state.schedulerVersion).toBe('fsrs-6');
    expect(state.lastReviewAt).toBeNull();
  });

  it('exposes a scheduling snapshot', () => {
    const state = newState();

    expect(state.toSnapshot()).toEqual({
      state: 'NEW',
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      scheduledDays: 0,
      lastReviewAt: null,
      dueAt: NOW,
    });
  });

  it('applies an outcome immutably', () => {
    const state = newState();
    const reviewedAt = new Date('2026-09-22T10:05:00.000Z');
    const dueAt = new Date('2026-09-23T10:05:00.000Z');

    const updated = state.applyOutcome(
      {
        state: 'REVIEW',
        stability: 4.5,
        difficulty: 5.2,
        reps: 1,
        lapses: 0,
        scheduledDays: 1,
        lastReviewAt: reviewedAt,
        dueAt,
      },
      reviewedAt,
    );

    expect(updated).not.toBe(state);
    expect(state.state).toBe('NEW');
    expect(updated.state).toBe('REVIEW');
    expect(updated.stability).toBe(4.5);
    expect(updated.scheduledDays).toBe(1);
    expect(updated.dueAt.toISOString()).toBe(dueAt.toISOString());
    expect(updated.updatedAt.toISOString()).toBe(reviewedAt.toISOString());
    expect(updated.isNew).toBe(false);
  });

  it('restores a persisted state', () => {
    const state = ReviewState.restore({
      cardId: CARD_ID,
      userId: USER_ID,
      stability: 3.2,
      difficulty: 6.1,
      state: 'RELEARNING',
      reps: 4,
      lapses: 1,
      scheduledDays: 2,
      lastReviewAt: NOW,
      dueAt: NOW,
      schedulerVersion: 'fsrs-6',
      createdAt: NOW,
      updatedAt: NOW,
    });

    expect(state.state).toBe('RELEARNING');
    expect(state.reps).toBe(4);
    expect(state.lapses).toBe(1);
    expect(state.isNew).toBe(false);
    expect(state.toSnapshot()).toMatchObject({ stability: 3.2, difficulty: 6.1 });
  });
});
