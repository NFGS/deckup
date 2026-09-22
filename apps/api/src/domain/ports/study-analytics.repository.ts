export interface ReviewOutcomeCounts {
  total: number;
  successful: number;
}

export interface ForecastRow {
  date: string;
  dueCount: number;
}

export interface AnalyticsSnapshot {
  /** Local calendar days with at least one review, most recent first. */
  reviewDays: string[];
  reviewsToday: number;
  dueToday: number;
  firstReviewOutcomes: ReviewOutcomeCounts;
  totalCards: number;
  totalDecks: number;
}

/**
 * Read model for study analytics (BR-04.3, BR-04.4, BR-04.5).
 */
export abstract class StudyAnalyticsRepositoryPort {
  abstract snapshot(
    userId: string,
    timezone: string,
    now: Date,
    windowDays: number,
  ): Promise<AnalyticsSnapshot>;

  abstract dueByDay(
    userId: string,
    timezone: string,
    now: Date,
    days: number,
  ): Promise<ForecastRow[]>;
}
