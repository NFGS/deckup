import { Inject, Injectable } from '@nestjs/common';
import type { CardDifficulty, ImportSummary } from '@deckup/shared';

import { Card } from '../../domain/entities/card.entity.js';
import { DomainError, NotFoundError, ValidationError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { CsvParserPort as CsvParser } from '../../domain/ports/csv-parser.port.js';
import type { CsvParserPort } from '../../domain/ports/csv-parser.port.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

export const MAX_IMPORT_ROWS = 1000;
export const MAX_REPORTED_ERRORS = 20;

const REQUIRED_COLUMNS = ['front', 'back'] as const;

const DIFFICULTY_BY_NAME: Record<string, CardDifficulty> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

@Injectable()
export class ImportCardsUseCase {
  constructor(
    @Inject(DeckRepository) private readonly decks: DeckRepositoryPort,
    @Inject(CardRepository) private readonly cards: CardRepositoryPort,
    @Inject(CsvParser) private readonly parser: CsvParserPort,
  ) {}

  async execute(deckId: string, ownerId: string, csvText: string): Promise<ImportSummary> {
    const deck = await this.decks.findByIdForOwner(deckId, ownerId);
    if (!deck) {
      throw new NotFoundError('Deck', deckId);
    }

    const parsed = this.parser.parse(csvText);

    for (const column of REQUIRED_COLUMNS) {
      if (!parsed.columns.includes(column)) {
        throw new ValidationError(`The CSV file must contain a '${column}' column`, {
          field: 'file',
        });
      }
    }

    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      throw new ValidationError(
        `A CSV import can contain at most ${MAX_IMPORT_ROWS} rows (received ${parsed.rows.length})`,
        { field: 'file' },
      );
    }

    const valid: Card[] = [];
    const errors: ImportSummary['errors'] = [];
    const duplicateRows: number[] = [];
    const seenFronts = new Set<string>();

    for (const row of parsed.rows) {
      try {
        const card = Card.create({
          deckId,
          front: row.values.front ?? '',
          back: row.values.back ?? '',
          hint: row.values.hint,
          difficulty: parseDifficulty(row.values.difficulty),
          tags: parseTags(row.values.tags),
        });

        const fingerprint = card.front.toLowerCase();

        if (seenFronts.has(fingerprint)) {
          duplicateRows.push(row.row);
        } else {
          seenFronts.add(fingerprint);
        }

        valid.push(card);
      } catch (error) {
        errors.push({
          row: row.row,
          message: error instanceof DomainError ? error.message : 'Invalid row',
        });
      }
    }

    if (valid.length > 0) {
      await this.cards.createMany(valid);
    }

    return {
      imported: valid.length,
      skipped: errors.length,
      errors: errors.slice(0, MAX_REPORTED_ERRORS),
      duplicateRows,
      ...(parsed.rows.length === 0
        ? { notice: 'The file only contained a header row; no cards were imported.' }
        : {}),
    };
  }
}

function parseDifficulty(raw: string | undefined): CardDifficulty | undefined {
  const value = raw?.trim().toLowerCase();

  if (!value) {
    return undefined;
  }

  const difficulty = DIFFICULTY_BY_NAME[value];

  if (!difficulty) {
    throw new ValidationError(`Difficulty must be easy, medium or hard (received '${raw}')`, {
      field: 'difficulty',
    });
  }

  return difficulty;
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(/[;|]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}
