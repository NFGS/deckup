import { Inject, Injectable } from '@nestjs/common';
import type { CardListQuery } from '@deckup/shared';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import type { CardListResult } from '../../domain/ports/card.repository.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

@Injectable()
export class ListCardsUseCase {
  constructor(
    @Inject(CardRepository) private readonly cards: CardRepositoryPort,
    @Inject(DeckRepository) private readonly decks: DeckRepositoryPort,
  ) {}

  async execute(deckId: string, ownerId: string, query: CardListQuery): Promise<CardListResult> {
    const deck = await this.decks.findByIdForOwner(deckId, ownerId);
    if (!deck) {
      throw new NotFoundError('Deck', deckId);
    }

    return this.cards.listByDeck(deckId, query.q, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
