import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

@Injectable()
export class DeleteDeckUseCase {
  constructor(@Inject(DeckRepository) private readonly decks: DeckRepositoryPort) {}

  async execute(deckId: string, ownerId: string): Promise<void> {
    const deck = await this.decks.findByIdForOwner(deckId, ownerId);
    if (!deck) {
      throw new NotFoundError('Deck', deckId);
    }

    await this.decks.softDelete(deckId, ownerId, new Date());
  }
}
