import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-errors.js';
import { Card } from './card.entity.js';

const DECK_ID = '22222222-2222-4222-8222-222222222222';

function createCard(overrides: Partial<Parameters<typeof Card.create>[0]> = {}): Card {
  return Card.create({
    deckId: DECK_ID,
    front: 'What is mitosis?',
    back: 'Cell division',
    ...overrides,
  });
}

describe('Card', () => {
  it('creates a card with optional fields defaulting to null', () => {
    const card = createCard();

    expect(card.hint).toBeNull();
    expect(card.imageUrl).toBeNull();
    expect(card.difficulty).toBeNull();
    expect(card.tags).toEqual([]);
  });

  it('requires non-empty front and back text', () => {
    expect(() => createCard({ front: '   ' })).toThrow(ValidationError);
    expect(() => createCard({ back: '' })).toThrow(ValidationError);
  });

  it('rejects faces longer than 2000 characters', () => {
    expect(() => createCard({ front: 'a'.repeat(2001) })).toThrow(ValidationError);
  });

  it('rejects hints longer than 300 characters', () => {
    expect(() => createCard({ hint: 'a'.repeat(301) })).toThrow(ValidationError);
  });

  it('trims text and normalizes tags', () => {
    const card = createCard({
      front: '  Question  ',
      tags: [' Cell ', 'cell', 'BIOLOGY'],
    });

    expect(card.front).toBe('Question');
    expect(card.tags).toEqual(['cell', 'biology']);
  });

  it('updates content immutably', () => {
    const card = createCard();
    const now = new Date('2026-09-22T10:00:00.000Z');

    const updated = card.update({ back: 'Updated answer', difficulty: 'HARD' }, now);

    expect(updated).not.toBe(card);
    expect(card.back).toBe('Cell division');
    expect(updated.back).toBe('Updated answer');
    expect(updated.difficulty).toBe('HARD');
    expect(updated.updatedAt.toISOString()).toBe(now.toISOString());
  });

  it('can clear an optional hint by passing null', () => {
    const card = createCard({ hint: 'Think about the nucleus' });
    const updated = card.update({ hint: null });

    expect(updated.hint).toBeNull();
  });
});
