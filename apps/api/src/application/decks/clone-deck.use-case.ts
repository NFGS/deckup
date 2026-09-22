import { Inject, Injectable } from '@nestjs/common';
import type { CloneDeck } from '@deckup/shared';

import { Card } from '../../domain/entities/card.entity.js';
import { Deck } from '../../domain/entities/deck.entity.js';
import { ConflictError, NotFoundError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort, DeckWithCounts } from '../../domain/ports/deck.repository.js';

const ATTRIBUTION_LIMIT = 500;

@Injectable()
export class CloneDeckUseCase {
  constructor(
    @Inject(DeckRepository) private readonly decks: DeckRepositoryPort,
    @Inject(CardRepository) private readonly cards: CardRepositoryPort,
  ) {}

  async execute(deckId: string, userId: string, input: CloneDeck): Promise<DeckWithCounts> {
    const source = await this.decks.findPublicById(deckId);

    if (!source) {
      throw new NotFoundError('Public deck', deckId);
    }

    if (source.deck.ownerId === userId) {
      throw new ConflictError('You already own this deck');
    }

    const sourceCards = await this.cards.findAllByDeck(deckId);

    const copy = Deck.create({
      ownerId: userId,
      title: input.title ?? source.deck.title,
      description: attribution(source.deck.title, source.authorName, source.deck.description),
      subject: source.deck.subject,
      color: source.deck.color,
      visibility: 'PRIVATE',
      tags: source.deck.tags,
    });

    await this.decks.create(copy);

    if (sourceCards.length > 0) {
      await this.cards.createMany(
        sourceCards.map((card) =>
          Card.create({
            deckId: copy.id,
            front: card.front,
            back: card.back,
            hint: card.hint,
            imageUrl: card.imageUrl,
            difficulty: card.difficulty,
            tags: card.tags,
          }),
        ),
      );
    }

    return { deck: copy, cardCount: sourceCards.length, dueCount: sourceCards.length };
  }
}

function attribution(sourceTitle: string, authorName: string, original: string | null): string {
  const note = `Cloned from "${sourceTitle}" by ${authorName}.`;
  const description = original ? `${note} ${original}` : note;

  return description.slice(0, ATTRIBUTION_LIMIT);
}
