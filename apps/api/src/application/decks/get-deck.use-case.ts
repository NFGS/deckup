import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import type { DeckWithCounts } from '../../domain/ports/deck.repository.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

@Injectable()
export class GetDeckUseCase {
  constructor(@Inject(DeckRepository) private readonly decks: DeckRepositoryPort) {}

  async execute(deckId: string, ownerId: string): Promise<DeckWithCounts> {
    const deck = await this.decks.findByIdForOwner(deckId, ownerId);
    if (!deck) {
      throw new NotFoundError('Deck', deckId);
    }
    return deck;
  }
}
