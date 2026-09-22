import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';

@Injectable()
export class DeleteCardUseCase {
  constructor(@Inject(CardRepository) private readonly cards: CardRepositoryPort) {}

  async execute(cardId: string, ownerId: string): Promise<void> {
    const card = await this.cards.findByIdForOwner(cardId, ownerId);
    if (!card) {
      throw new NotFoundError('Card', cardId);
    }

    await this.cards.softDelete(cardId, ownerId, new Date());
  }
}
