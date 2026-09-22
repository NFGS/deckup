import type {
  AnalyticsSnapshot,
  ForecastRow,
  ReviewOutcomeCounts,
} from '../ports/study-analytics.repository.js';
import { shiftDateKey } from '../value-objects/local-date.js';

export interface AnalyticsOverviewResult {
  streak: number;
  reviewsToday: number;
  dueToday: number;
  retention30d: number;
  totalCards: number;
  totalDecks: number;
}

/**
 * Study metrics policy.
 *
 * - **Streak** (BR-04.3): consecutive local days with at least one review. The
 *   streak stays alive while today or yesterday has reviews; a full local day
 *   without reviews resets it to zero.
 * - **Retention** (BR-04.4): share of first reviews in the window rated Good or
 *   Easy.
 * - **Forecast** (BR-04.5): one entry per local day, zero-filled.
 */
export class StudyMetricsService {
  overview(snapshot: AnalyticsSnapshot, todayKey: string): AnalyticsOverviewResult {
    return {
      streak: this.streak(snapshot.reviewDays, todayKey),
      reviewsToday: snapshot.reviewsToday,
      dueToday: snapshot.dueToday,
      retention30d: this.retention(snapshot.firstReviewOutcomes),
      totalCards: snapshot.totalCards,
      totalDecks: snapshot.totalDecks,
    };
  }

  streak(reviewDays: string[], todayKey: string): number {
    if (reviewDays.length === 0) {
      return 0;
    }

    const days = new Set(reviewDays);
    const yesterdayKey = shiftDateKey(todayKey, -1);

    let cursor = days.has(todayKey) ? todayKey : days.has(yesterdayKey) ? yesterdayKey : null;

    if (cursor === null) {
      return 0;
    }

    let streak = 0;

    while (days.has(cursor)) {
      streak += 1;
      cursor = shiftDateKey(cursor, -1);
    }

    return streak;
  }

  retention(counts: ReviewOutcomeCounts): number {
    return counts.total === 0 ? 0 : counts.successful / counts.total;
  }

  forecast(rows: ForecastRow[], todayKey: string, days: number): ForecastRow[] {
    const byDate = new Map(rows.map((row) => [row.date, row.dueCount]));

    return Array.from({ length: days }, (_, index) => {
      const date = shiftDateKey(todayKey, index);
      return { date, dueCount: byDate.get(date) ?? 0 };
    });
  }
}
