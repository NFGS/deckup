import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-errors.js';
import { Deck } from './deck.entity.js';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';

function createDeck(overrides: Partial<Parameters<typeof Deck.create>[0]> = {}): Deck {
  return Deck.create({ ownerId: OWNER_ID, title: 'Biology — Unit 3', ...overrides });
}

describe('Deck', () => {
  it('creates a private deck by default', () => {
    const deck = createDeck();

    expect(deck.visibility).toBe('PRIVATE');
    expect(deck.tags).toEqual([]);
    expect(deck.isDeleted).toBe(false);
    expect(deck.deletedAt).toBeNull();
  });

  it('trims the title and rejects empty or oversized values', () => {
    expect(createDeck({ title: '  History  ' }).title).toBe('History');
    expect(() => createDeck({ title: '   ' })).toThrow(ValidationError);
    expect(() => createDeck({ title: 'a'.repeat(121) })).toThrow(ValidationError);
  });

  it('normalizes tags: trim, lower-case and deduplicate', () => {
    const deck = createDeck({ tags: ['  Exam-1 ', 'exam-1', 'Biology'] });

    expect(deck.tags).toEqual(['exam-1', 'biology']);
  });

  it('rejects more than 20 tags', () => {
    const tags = Array.from({ length: 21 }, (_, index) => `tag-${index}`);

    expect(() => createDeck({ tags })).toThrow(ValidationError);
  });

  it('validates the color format', () => {
    expect(createDeck({ color: '#1E88E5' }).color).toBe('#1E88E5');
    expect(() => createDeck({ color: 'blue' })).toThrow(ValidationError);
  });

  it('treats blank optional text as null', () => {
    const deck = createDeck({ description: '   ', subject: '' });

    expect(deck.description).toBeNull();
    expect(deck.subject).toBeNull();
  });

  it('updates fields immutably and refreshes updatedAt', () => {
    const deck = createDeck();
    const now = new Date('2026-09-22T10:00:00.000Z');

    const updated = deck.update({ title: 'Biology — Final', subject: 'Biology' }, now);

    expect(updated).not.toBe(deck);
    expect(deck.title).toBe('Biology — Unit 3');
    expect(updated.title).toBe('Biology — Final');
    expect(updated.subject).toBe('Biology');
    expect(updated.updatedAt.toISOString()).toBe(now.toISOString());
  });

  it('marks a deck as deleted without losing data', () => {
    const deck = createDeck();
    const deleted = deck.markDeleted(new Date('2026-09-22T11:00:00.000Z'));

    expect(deleted.isDeleted).toBe(true);
    expect(deleted.title).toBe(deck.title);
  });
});
