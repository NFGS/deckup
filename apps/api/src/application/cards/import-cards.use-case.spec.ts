import { beforeEach, describe, expect, it } from 'vitest';

import { Deck } from '../../domain/entities/deck.entity.js';
import { NotFoundError, ValidationError } from '../../domain/errors/domain-errors.js';
import { FakeCsvParser } from '../../testing/fakes/fake-csv-parser.fake.js';
import { InMemoryCardRepository } from '../../testing/fakes/in-memory-card.repository.fake.js';
import { InMemoryDeckRepository } from '../../testing/fakes/in-memory-deck.repository.fake.js';
import { ImportCardsUseCase, MAX_IMPORT_ROWS } from './import-cards.use-case.js';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '99999999-9999-4999-8999-999999999999';

describe('ImportCardsUseCase', () => {
  let decks: InMemoryDeckRepository;
  let cards: InMemoryCardRepository;
  let parser: FakeCsvParser;
  let useCase: ImportCardsUseCase;
  let deckId: string;

  beforeEach(async () => {
    decks = new InMemoryDeckRepository();
    cards = new InMemoryCardRepository();
    parser = new FakeCsvParser();
    useCase = new ImportCardsUseCase(decks, cards, parser);

    const deck = Deck.create({ ownerId: OWNER_ID, title: 'Biology — Unit 3' });
    await decks.create(deck);
    deckId = deck.id;
    cards.registerDeckOwner(deckId, OWNER_ID);
  });

  it('imports valid rows and reports the summary', async () => {
    parser.columns = ['front', 'back', 'hint', 'difficulty', 'tags'];
    parser.rows = [
      {
        row: 2,
        values: {
          front: 'Q1',
          back: 'A1',
          hint: 'think about it',
          difficulty: 'easy',
          tags: 'unit-3; exam',
        },
      },
      { row: 3, values: { front: 'Q2', back: 'A2', hint: '', difficulty: '', tags: '' } },
    ];

    const summary = await useCase.execute(deckId, OWNER_ID, 'raw csv');

    expect(summary).toEqual({ imported: 2, skipped: 0, errors: [], duplicateRows: [] });
    expect(parser.lastText).toBe('raw csv');
    expect(cards.cards.size).toBe(2);

    const imported = await cards.findAllByDeck(deckId);
    expect(imported[0]?.hint).toBe('think about it');
    expect(imported[0]?.difficulty).toBe('EASY');
    expect(imported[0]?.tags).toEqual(['unit-3', 'exam']);
  });

  it('skips invalid rows and reports their line numbers', async () => {
    parser.rows = [
      { row: 2, values: { front: 'Q1', back: 'A1' } },
      { row: 3, values: { front: '', back: 'A2' } },
      { row: 4, values: { front: 'Q3', back: 'A3' } },
    ];

    const summary = await useCase.execute(deckId, OWNER_ID, 'raw csv');

    expect(summary.imported).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]?.row).toBe(3);
  });

  it('reports invalid difficulty values', async () => {
    parser.columns = ['front', 'back', 'difficulty'];
    parser.rows = [{ row: 2, values: { front: 'Q1', back: 'A1', difficulty: 'impossible' } }];

    const summary = await useCase.execute(deckId, OWNER_ID, 'raw csv');

    expect(summary.imported).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]?.message).toMatch(/difficulty/i);
  });

  it('rejects a CSV without the required columns', async () => {
    parser.columns = ['question', 'answer'];

    await expect(useCase.execute(deckId, OWNER_ID, 'raw csv')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejects more rows than the import limit', async () => {
    parser.rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => ({
      row: index + 2,
      values: { front: `Q${index}`, back: `A${index}` },
    }));

    await expect(useCase.execute(deckId, OWNER_ID, 'raw csv')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejects a deck that does not belong to the student', async () => {
    await expect(useCase.execute(deckId, OTHER_ID, 'raw csv')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('flags duplicated rows but still imports them (E1)', async () => {
    parser.rows = [
      { row: 2, values: { front: 'Q1', back: 'A1' } },
      { row: 3, values: { front: 'q1', back: 'A1 again' } },
      { row: 4, values: { front: 'Q2', back: 'A2' } },
    ];

    const summary = await useCase.execute(deckId, OWNER_ID, 'raw csv');

    expect(summary.imported).toBe(3);
    expect(summary.duplicateRows).toEqual([3]);
  });

  it('reports a notice for a header-only file (E2)', async () => {
    parser.rows = [];

    const summary = await useCase.execute(deckId, OWNER_ID, 'raw csv');

    expect(summary.imported).toBe(0);
    expect(summary.notice).toMatch(/header row/i);
  });

  it('imports nothing when every row is invalid', async () => {
    parser.rows = [
      { row: 2, values: { front: '', back: '' } },
      { row: 3, values: { front: '', back: '' } },
    ];

    const summary = await useCase.execute(deckId, OWNER_ID, 'raw csv');

    expect(summary.imported).toBe(0);
    expect(cards.cards.size).toBe(0);
  });
});
