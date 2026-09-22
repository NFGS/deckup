import { z } from 'zod';

export const analyticsOverviewSchema = z.object({
  streak: z.number().int().nonnegative(),
  reviewsToday: z.number().int().nonnegative(),
  dueToday: z.number().int().nonnegative(),
  retention30d: z.number().min(0).max(1),
  totalCards: z.number().int().nonnegative(),
  totalDecks: z.number().int().nonnegative(),
});

export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

export const forecastDaySchema = z.object({
  date: z.iso.date(),
  dueCount: z.number().int().nonnegative(),
});

export type ForecastDay = z.infer<typeof forecastDaySchema>;

export const forecastResponseSchema = z.object({
  days: z.array(forecastDaySchema),
});

export type ForecastResponse = z.infer<typeof forecastResponseSchema>;

export const forecastQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;
