import { z } from 'zod';

/**
 * Self-assessed recall quality for a reviewed card.
 *
 * The four ratings map directly to the FSRS grading scale.
 */
export const reviewRatingSchema = z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY']);

export type ReviewRating = z.infer<typeof reviewRatingSchema>;
