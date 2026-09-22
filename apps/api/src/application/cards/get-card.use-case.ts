import { Inject, Injectable } from '@nestjs/common';

import type { Card } from '../../domain/entities/card.entity.js';
import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';

@Injectable()
export class GetCardUseCase {
  constructor(@Inject(CardRepository) private readonly cards: CardRepositoryPort) {}

  async execute(cardId: string, ownerId: string): Promise<Card> {
    const card = await this.cards.findByIdForOwner(cardId, ownerId);
    if (!card) {
      throw new NotFoundError('Card', cardId);
    }
    return card;
  }
}
