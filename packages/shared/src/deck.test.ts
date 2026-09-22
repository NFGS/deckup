import { describe, expect, it } from 'vitest';

import { deckVisibilitySchema } from './deck.js';

describe('deckVisibilitySchema', () => {
  it('accepts every supported visibility', () => {
    expect(deckVisibilitySchema.parse('PRIVATE')).toBe('PRIVATE');
    expect(deckVisibilitySchema.parse('UNLISTED')).toBe('UNLISTED');
    expect(deckVisibilitySchema.parse('PUBLIC')).toBe('PUBLIC');
  });

  it('rejects unknown values', () => {
    expect(() => deckVisibilitySchema.parse('SHARED')).toThrow();
    expect(() => deckVisibilitySchema.parse('private')).toThrow();
  });
});
