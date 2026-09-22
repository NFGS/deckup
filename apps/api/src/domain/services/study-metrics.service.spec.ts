import { describe, expect, it } from 'vitest';

import { StudyMetricsService } from './study-metrics.service.js';

const TODAY = '2026-09-22';

describe('StudyMetricsService', () => {
  const metrics = new StudyMetricsService();

  describe('streak', () => {
    it('is zero without reviews', () => {
      expect(metrics.streak([], TODAY)).toBe(0);
    });

    it('counts consecutive days ending today', () => {
      expect(metrics.streak(['2026-09-22', '2026-09-21', '2026-09-20'], TODAY)).toBe(3);
    });

    it('stays alive when only yesterday has reviews', () => {
      expect(metrics.streak(['2026-09-21', '2026-09-20'], TODAY)).toBe(2);
    });

    it('resets after a full day without reviews', () => {
      expect(metrics.streak(['2026-09-20', '2026-09-19'], TODAY)).toBe(0);
    });

    it('stops at the first gap', () => {
      expect(metrics.streak(['2026-09-22', '2026-09-20', '2026-09-19'], TODAY)).toBe(1);
    });

    it('crosses month boundaries', () => {
      expect(metrics.streak(['2026-10-01', '2026-09-30', '2026-09-29'], '2026-10-01')).toBe(3);
    });
  });

  describe('retention', () => {
    it('is zero without first reviews', () => {
      expect(metrics.retention({ total: 0, successful: 0 })).toBe(0);
    });

    it('is the share of successful first reviews', () => {
      expect(metrics.retention({ total: 20, successful: 15 })).toBe(0.75);
    });
  });

  describe('forecast', () => {
    it('fills missing days with zero', () => {
      const result = metrics.forecast([{ date: '2026-09-24', dueCount: 5 }], TODAY, 3);

      expect(result).toEqual([
        { date: '2026-09-22', dueCount: 0 },
        { date: '2026-09-23', dueCount: 0 },
        { date: '2026-09-24', dueCount: 5 },
      ]);
    });
  });

  describe('overview', () => {
    it('combines the snapshot with the computed metrics', () => {
      const result = metrics.overview(
        {
          reviewDays: ['2026-09-22'],
          reviewsToday: 4,
          dueToday: 7,
          firstReviewOutcomes: { total: 10, successful: 8 },
          totalCards: 50,
          totalDecks: 3,
        },
        TODAY,
      );

      expect(result).toEqual({
        streak: 1,
        reviewsToday: 4,
        dueToday: 7,
        retention30d: 0.8,
        totalCards: 50,
        totalDecks: 3,
      });
    });
  });
});
