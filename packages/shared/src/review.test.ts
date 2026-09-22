import { describe, expect, it } from 'vitest';

import { reviewRatingSchema } from './review.js';

describe('reviewRatingSchema', () => {
  it('accepts the four FSRS ratings', () => {
    expect(reviewRatingSchema.options).toEqual(['AGAIN', 'HARD', 'GOOD', 'EASY']);
  });

  it('rejects unsupported ratings', () => {
    expect(() => reviewRatingSchema.parse('PERFECT')).toThrow();
  });
});
