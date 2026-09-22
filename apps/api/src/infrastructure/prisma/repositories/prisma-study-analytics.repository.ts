import { Injectable } from '@nestjs/common';
import type { ReviewRating } from '@deckup/shared';

import { StudyAnalyticsRepositoryPort } from '../../../domain/ports/study-analytics.repository.js';
import type {
  AnalyticsSnapshot,
  ForecastRow,
  ReviewOutcomeCounts,
} from '../../../domain/ports/study-analytics.repository.js';
import { PrismaService } from '../prisma.service.js';

const STREAK_LOOKBACK_DAYS = 400;
const SUCCESSFUL_RATINGS: readonly ReviewRating[] = ['GOOD', 'EASY'];

interface DayRow {
  day: string;
}

interface CountRow {
  count: number;
}

interface RatingRow {
  rating: ReviewRating;
  count: number;
}

interface ForecastDayRow {
  day: string;
  count: number;
}

@Injectable()
export class PrismaStudyAnalyticsRepository extends StudyAnalyticsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async snapshot(
    userId: string,
    timezone: string,
    now: Date,
    windowDays: number,
  ): Promise<AnalyticsSnapshot> {
    const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const [reviewDays, reviewsToday, outcomes, dueToday, totalCards, totalDecks] =
      await Promise.all([
        this.prisma.$queryRaw<DayRow[]>`
          SELECT DISTINCT to_char(reviewed_at AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS day
          FROM review_logs
          WHERE user_id = ${userId}::uuid
          ORDER BY day DESC
          LIMIT ${STREAK_LOOKBACK_DAYS}
        `,
        this.prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*)::int AS count
          FROM review_logs
          WHERE user_id = ${userId}::uuid
            AND (reviewed_at AT TIME ZONE ${timezone})::date
              = (${now}::timestamptz AT TIME ZONE ${timezone})::date
        `,
        this.prisma.$queryRaw<RatingRow[]>`
          SELECT rating, COUNT(*)::int AS count
          FROM (
            SELECT DISTINCT ON (card_id) card_id, rating
            FROM review_logs
            WHERE user_id = ${userId}::uuid
              AND reviewed_at >= ${since}::timestamptz
            ORDER BY card_id, reviewed_at ASC
          ) AS first_reviews
          GROUP BY rating
        `,
        this.prisma.card.count({
          where: {
            deck: { ownerId: userId, deletedAt: null },
            deletedAt: null,
            OR: [{ reviewState: { is: null } }, { reviewState: { dueAt: { lte: now } } }],
          },
        }),
        this.prisma.card.count({
          where: { deck: { ownerId: userId, deletedAt: null }, deletedAt: null },
        }),
        this.prisma.deck.count({ where: { ownerId: userId, deletedAt: null } }),
      ]);

    return {
      reviewDays: reviewDays.map((row) => row.day),
      reviewsToday: reviewsToday[0]?.count ?? 0,
      dueToday,
      firstReviewOutcomes: toOutcomeCounts(outcomes),
      totalCards,
      totalDecks,
    };
  }

  async dueByDay(
    userId: string,
    timezone: string,
    now: Date,
    days: number,
  ): Promise<ForecastRow[]> {
    const rows = await this.prisma.$queryRaw<ForecastDayRow[]>`
      SELECT to_char(
               GREATEST(rs.due_at, ${now}::timestamptz) AT TIME ZONE ${timezone},
               'YYYY-MM-DD'
             ) AS day,
             COUNT(*)::int AS count
      FROM review_states rs
      JOIN cards c ON c.id = rs.card_id AND c.deleted_at IS NULL
      JOIN decks d ON d.id = c.deck_id AND d.deleted_at IS NULL
      WHERE rs.user_id = ${userId}::uuid
        AND rs.due_at < ${now}::timestamptz + (${days}::int * interval '1 day')
      GROUP BY day
      ORDER BY day ASC
    `;

    return rows.map((row) => ({ date: row.day, dueCount: row.count }));
  }
}

function toOutcomeCounts(rows: RatingRow[]): ReviewOutcomeCounts {
  let total = 0;
  let successful = 0;

  for (const row of rows) {
    total += row.count;

    if (SUCCESSFUL_RATINGS.includes(row.rating)) {
      successful += row.count;
    }
  }

  return { total, successful };
}
