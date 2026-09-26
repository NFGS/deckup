import { Inject, Injectable, Logger } from '@nestjs/common';
import { CARD_IMAGE_MAX_BYTES } from '@deckup/shared';

import type { Card } from '../../domain/entities/card.entity.js';
import { NotFoundError, ValidationError } from '../../domain/errors/domain-errors.js';
import { CardRepositoryPort as CardRepository } from '../../domain/ports/card.repository.js';
import type { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { ImageStoragePort } from '../../domain/ports/image-storage.port.js';

export interface UploadCardImageInput {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

@Injectable()
export class UploadCardImageUseCase {
  private readonly logger = new Logger(UploadCardImageUseCase.name);

  constructor(
    @Inject(CardRepository) private readonly cards: CardRepositoryPort,
    @Inject(ImageStoragePort) private readonly images: ImageStoragePort,
  ) {}

  async execute(cardId: string, ownerId: string, input: UploadCardImageInput): Promise<Card> {
    const card = await this.cards.findByIdForOwner(cardId, ownerId);

    if (!card) {
      throw new NotFoundError('Card', cardId);
    }

    const mimeType = detectImageMimeType(input.buffer);

    const stored = await this.images.upload({
      ownerId,
      cardId,
      buffer: input.buffer,
      mimeType,
      filename: input.filename,
    });

    if (card.imagePublicId) {
      await this.images.remove(card.imagePublicId).catch((error: unknown) => {
        this.logger.warn(
          `Could not delete the replaced image ${card.imagePublicId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }

    const updated = card.update({ imageUrl: stored.url, imagePublicId: stored.publicId });
    await this.cards.update(updated);

    return updated;
  }
}

function detectImageMimeType(buffer: Buffer): 'image/jpeg' | 'image/png' {
  if (buffer.byteLength > CARD_IMAGE_MAX_BYTES) {
    throw new ValidationError('The image must be at most 5 MB', { field: 'file' });
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }

  throw new ValidationError('The image must be a JPEG or PNG file', { field: 'file' });
}
