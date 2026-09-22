import { describe, expect, it } from 'vitest';

import { ConflictError } from '../errors/domain-errors.js';
import { StudySession } from './study-session.entity.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const DECK_ID = '22222222-2222-4222-8222-222222222222';

function startSession(): StudySession {
  return StudySession.start({ userId: USER_ID, deckId: DECK_ID });
}

describe('StudySession', () => {
  it('starts active with zeroed counters', () => {
    const session = startSession();

    expect(session.status).toBe('ACTIVE');
    expect(session.isActive).toBe(true);
    expect(session.cardsReviewed).toBe(0);
    expect(session.correctCount).toBe(0);
    expect(session.endedAt).toBeNull();
  });

  it('counts Good and Easy ratings as correct', () => {
    const session = startSession().recordReview('GOOD').recordReview('EASY').recordReview('AGAIN');

    expect(session.cardsReviewed).toBe(3);
    expect(session.correctCount).toBe(2);
  });

  it('counts Hard as incorrect for accuracy purposes', () => {
    const session = startSession().recordReview('HARD');

    expect(session.cardsReviewed).toBe(1);
    expect(session.correctCount).toBe(0);
  });

  it('computes accuracy safely when nothing was reviewed', () => {
    expect(startSession().accuracy).toBe(0);
  });

  it('rejects reviews on a completed session', () => {
    const completed = startSession().complete();

    expect(() => completed.recordReview('GOOD')).toThrow(ConflictError);
  });

  it('completes once and stays idempotent', () => {
    const now = new Date('2026-09-22T11:00:00.000Z');
    const completed = startSession().complete(now);

    expect(completed.status).toBe('COMPLETED');
    expect(completed.endedAt?.toISOString()).toBe(now.toISOString());
    expect(completed.complete(new Date('2026-09-22T12:00:00.000Z'))).toBe(completed);
  });

  it('abandons an active session and stays idempotent', () => {
    const now = new Date('2026-09-22T11:00:00.000Z');
    const abandoned = startSession().abandon(now);

    expect(abandoned.status).toBe('ABANDONED');
    expect(abandoned.isActive).toBe(false);
    expect(abandoned.endedAt?.toISOString()).toBe(now.toISOString());
    expect(abandoned.abandon(new Date('2026-09-22T12:00:00.000Z'))).toBe(abandoned);
  });

  it('rejects completing an abandoned session', () => {
    const abandoned = startSession().abandon();

    expect(() => abandoned.complete()).toThrow(ConflictError);
  });

  it('rejects abandoning a completed session', () => {
    const completed = startSession().complete();

    expect(() => completed.abandon()).toThrow(ConflictError);
  });

  it('rejects reviews on an abandoned session', () => {
    const abandoned = startSession().abandon();

    expect(() => abandoned.recordReview('GOOD')).toThrow(ConflictError);
  });
});
