import { Inject, Injectable } from '@nestjs/common';
import type { UpdateDeck } from '@deckup/shared';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import type { DeckWithCounts } from '../../domain/ports/deck.repository.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

@Injectable()
export class UpdateDeckUseCase {
  constructor(@Inject(DeckRepository) private readonly decks: DeckRepositoryPort) {}

  async execute(deckId: string, ownerId: string, patch: UpdateDeck): Promise<DeckWithCounts> {
    const current = await this.decks.findByIdForOwner(deckId, ownerId);
    if (!current) {
      throw new NotFoundError('Deck', deckId);
    }

    const updated = current.deck.update(patch);
    await this.decks.update(updated);

    return { ...current, deck: updated };
  }
}
