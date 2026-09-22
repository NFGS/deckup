import { Inject, Injectable } from '@nestjs/common';
import type { CreateDeck } from '@deckup/shared';

import { Deck } from '../../domain/entities/deck.entity.js';
import type { DeckWithCounts } from '../../domain/ports/deck.repository.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

@Injectable()
export class CreateDeckUseCase {
  constructor(@Inject(DeckRepository) private readonly decks: DeckRepositoryPort) {}

  async execute(ownerId: string, input: CreateDeck): Promise<DeckWithCounts> {
    const deck = Deck.create({
      ownerId,
      title: input.title,
      description: input.description,
      subject: input.subject,
      color: input.color,
      visibility: input.visibility,
      tags: input.tags,
    });

    await this.decks.create(deck);

    return { deck, cardCount: 0, dueCount: 0 };
  }
}
