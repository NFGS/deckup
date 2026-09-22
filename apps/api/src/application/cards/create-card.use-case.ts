import { Inject, Injectable } from '@nestjs/common';
import type { CreateCard } from '@deckup/shared';

import { Card } from '../../domain/entities/card.entity.js';
import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

@Injectable()
export class CreateCardUseCase {
  constructor(
    @Inject(CardRepository) private readonly cards: CardRepositoryPort,
    @Inject(DeckRepository) private readonly decks: DeckRepositoryPort,
  ) {}

  async execute(deckId: string, ownerId: string, input: CreateCard): Promise<Card> {
    const deck = await this.decks.findByIdForOwner(deckId, ownerId);
    if (!deck) {
      throw new NotFoundError('Deck', deckId);
    }

    const card = Card.create({
      deckId,
      front: input.front,
      back: input.back,
      hint: input.hint,
      imageUrl: input.imageUrl,
      difficulty: input.difficulty,
      tags: input.tags,
    });

    await this.cards.create(card);

    return card;
  }
}
