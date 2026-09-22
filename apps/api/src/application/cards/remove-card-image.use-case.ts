import { Inject, Injectable } from '@nestjs/common';

import type { Card } from '../../domain/entities/card.entity.js';
import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { ImageStoragePort } from '../../domain/ports/image-storage.port.js';

@Injectable()
export class RemoveCardImageUseCase {
  constructor(
    @Inject(CardRepository) private readonly cards: CardRepositoryPort,
    @Inject(ImageStoragePort) private readonly images: ImageStoragePort,
  ) {}

  async execute(cardId: string, ownerId: string): Promise<Card> {
    const card = await this.cards.findByIdForOwner(cardId, ownerId);

    if (!card) {
      throw new NotFoundError('Card', cardId);
    }

    if (card.imageUrl === null && card.imagePublicId === null) {
      return card;
    }

    if (card.imagePublicId) {
      await this.images.remove(card.imagePublicId).catch(() => undefined);
    }

    const updated = card.update({ imageUrl: null, imagePublicId: null });
    await this.cards.update(updated);

    return updated;
  }
}
