import { beforeEach, describe, expect, it } from 'vitest';

import { Deck } from '../../domain/entities/deck.entity.js';
import { NotFoundError, ValidationError } from '../../domain/errors/domain-errors.js';
import { CsvParserAdapter } from '../../infrastructure/csv/csv-parser.adapter.js';
import { InMemoryCardRepository } from '../../testing/fakes/in-memory-card.repository.fake.js';
import { InMemoryDeckRepository } from '../../testing/fakes/in-memory-deck.repository.fake.js';
import { ImportCardsUseCase, MAX_IMPORT_ROWS } from './import-cards.use-case.js';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '99999999-9999-4999-8999-999999999999';

describe('ImportCardsUseCase', () => {
  let decks: InMemoryDeckRepository;
  let cards: InMemoryCardRepository;
  let useCase: ImportCardsUseCase;
  let deckId: string;

  beforeEach(async () => {
    decks = new InMemoryDeckRepository();
    cards = new InMemoryCardRepository();
    useCase = new ImportCardsUseCase(decks, cards, new CsvParserAdapter());

    const deck = Deck.create({ ownerId: OWNER_ID, title: 'Biology — Unit 3' });
    await decks.create(deck);
    deckId = deck.id;
  });

  it('imports valid rows and reports the summary', async () => {
    const csv = [
      'front,back,hint,difficulty,tags',
      'Q1,A1,think about it,easy,"unit-3; exam"',
      'Q2,A2,,,',
    ].join('\n');

    const summary = await useCase.execute(deckId, OWNER_ID, csv);

    expect(summary).toEqual({ imported: 2, skipped: 0, errors: [], duplicateRows: [] });
    expect(cards.cards.size).toBe(2);

    const imported = await cards.findAllByDeck(deckId);
    expect(imported[0]?.hint).toBe('think about it');
    expect(imported[0]?.difficulty).toBe('EASY');
    expect(imported[0]?.tags).toEqual(['unit-3', 'exam']);
  });

  it('handles a UTF-8 BOM and CRLF line endings', async () => {
    const csv = `\uFEFFfront,back\r\nQ1,A1\r\nQ2,A2\r\n`;

    const summary = await useCase.execute(deckId, OWNER_ID, csv);

    expect(summary.imported).toBe(2);
  });

  it('skips invalid rows and reports their line numbers', async () => {
    const csv = ['front,back', 'Q1,A1', ',A2', 'Q3,A3'].join('\r\n');

    const summary = await useCase.execute(deckId, OWNER_ID, csv);

    expect(summary.imported).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]?.row).toBe(3);
  });

  it('reports invalid difficulty values', async () => {
    const csv = ['front,back,difficulty', 'Q1,A1,impossible'].join('\n');

    const summary = await useCase.execute(deckId, OWNER_ID, csv);

    expect(summary.imported).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]?.message).toMatch(/difficulty/i);
  });

  it('rejects a CSV without the required columns', async () => {
    const csv = ['question,answer', 'Q1,A1'].join('\n');

    await expect(useCase.execute(deckId, OWNER_ID, csv)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects more rows than the import limit', async () => {
    const lines = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => `Q${index},A${index}`);
    const csv = ['front,back', ...lines].join('\n');

    await expect(useCase.execute(deckId, OWNER_ID, csv)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a deck that does not belong to the student', async () => {
    const csv = ['front,back', 'Q1,A1'].join('\n');

    await expect(useCase.execute(deckId, OTHER_ID, csv)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('flags duplicated rows but still imports them (E1)', async () => {
    const csv = ['front,back', 'Q1,A1', 'Q1,A1 again', 'Q2,A2'].join('\n');

    const summary = await useCase.execute(deckId, OWNER_ID, csv);

    expect(summary.imported).toBe(3);
    expect(summary.duplicateRows).toEqual([3]);
  });

  it('reports a notice for a header-only file (E2)', async () => {
    const csv = 'front,back\n';

    const summary = await useCase.execute(deckId, OWNER_ID, csv);

    expect(summary.imported).toBe(0);
    expect(summary.notice).toMatch(/header row/i);
  });

  it('imports nothing when every row is invalid', async () => {
    const csv = ['front,back', ',', ','].join('\n');

    const summary = await useCase.execute(deckId, OWNER_ID, csv);

    expect(summary.imported).toBe(0);
    expect(cards.cards.size).toBe(0);
  });
});
