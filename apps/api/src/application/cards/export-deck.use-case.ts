import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { CsvWriterPort as CsvWriter } from '../../domain/ports/csv-writer.port.js';
import type { CsvWriterPort } from '../../domain/ports/csv-writer.port.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

const CSV_HEADER = ['front', 'back', 'hint', 'difficulty', 'tags'];
const MAX_SLUG_LENGTH = 60;

export interface DeckExport {
  filename: string;
  csv: string;
}

@Injectable()
export class ExportDeckUseCase {
  constructor(
    @Inject(DeckRepository) private readonly decks: DeckRepositoryPort,
    @Inject(CardRepository) private readonly cards: CardRepositoryPort,
    @Inject(CsvWriter) private readonly writer: CsvWriterPort,
  ) {}

  async execute(deckId: string, ownerId: string): Promise<DeckExport> {
    const result = await this.decks.findByIdForOwner(deckId, ownerId);
    if (!result) {
      throw new NotFoundError('Deck', deckId);
    }

    const cards = await this.cards.findAllByDeck(deckId);

    const rows = [
      CSV_HEADER,
      ...cards.map((card) => [
        card.front,
        card.back,
        card.hint ?? '',
        card.difficulty?.toLowerCase() ?? '',
        card.tags.join('; '),
      ]),
    ];

    return {
      filename: `${slugify(result.deck.title)}.csv`,
      csv: this.writer.write(rows),
    };
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH);

  return slug.length > 0 ? slug : 'deck';
}
