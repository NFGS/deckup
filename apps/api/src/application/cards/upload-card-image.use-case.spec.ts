import { beforeEach, describe, expect, it } from 'vitest';
import { CARD_IMAGE_MAX_BYTES } from '@deckup/shared';

import { Card } from '../../domain/entities/card.entity.js';
import { ValidationError } from '../../domain/errors/domain-errors.js';
import { FakeImageStorage } from '../../testing/fakes/fake-image-storage.fake.js';
import { InMemoryCardRepository } from '../../testing/fakes/in-memory-card.repository.fake.js';
import { UploadCardImageUseCase } from './upload-card-image.use-case.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

describe('UploadCardImageUseCase', () => {
  let cards: InMemoryCardRepository;
  let images: FakeImageStorage;
  let useCase: UploadCardImageUseCase;
  let card: Card;

  beforeEach(async () => {
    cards = new InMemoryCardRepository();
    images = new FakeImageStorage();
    useCase = new UploadCardImageUseCase(cards, images);
    card = Card.create({ deckId: 'deck-1', front: 'Question', back: 'Answer' });
    await cards.create(card);
    cards.registerDeckOwner('deck-1', 'user-1');
  });

  it('stores a PNG and persists the delivery URL', async () => {
    const updated = await useCase.execute(card.id, 'user-1', {
      buffer: PNG,
      mimeType: 'image/png',
      filename: 'diagram.png',
    });

    expect(updated.imageUrl).toBeTruthy();
    expect(updated.imagePublicId).toBeTruthy();
    expect(images.uploads).toHaveLength(1);
    expect(images.uploads[0]?.mimeType).toBe('image/png');
    expect(images.uploads[0]?.ownerId).toBe('user-1');
    expect((await cards.findByIdForOwner(card.id, 'user-1'))?.imageUrl).toBe(updated.imageUrl);
  });

  it('accepts JPEG uploads and uses the detected type', async () => {
    const updated = await useCase.execute(card.id, 'user-1', {
      buffer: JPEG,
      mimeType: 'application/octet-stream',
      filename: 'photo.jpg',
    });

    expect(updated.imageUrl).toBeTruthy();
    expect(images.uploads[0]?.mimeType).toBe('image/jpeg');
  });

  it('rejects files that are not JPEG or PNG', async () => {
    await expect(
      useCase.execute(card.id, 'user-1', {
        buffer: Buffer.from('not an image'),
        mimeType: 'text/plain',
        filename: 'notes.txt',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(images.uploads).toHaveLength(0);
  });

  it('rejects images above the 5 MB limit', async () => {
    const huge = Buffer.alloc(CARD_IMAGE_MAX_BYTES + 1);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;

    await expect(
      useCase.execute(card.id, 'user-1', {
        buffer: huge,
        mimeType: 'image/jpeg',
        filename: 'huge.jpg',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('replaces the previous asset', async () => {
    const first = await useCase.execute(card.id, 'user-1', {
      buffer: PNG,
      mimeType: 'image/png',
      filename: 'first.png',
    });

    await useCase.execute(card.id, 'user-1', {
      buffer: JPEG,
      mimeType: 'image/jpeg',
      filename: 'second.jpg',
    });

    expect(images.removed).toEqual([first.imagePublicId]);
    expect(images.uploads).toHaveLength(2);
  });

  it('returns not found for an unknown card', async () => {
    await expect(
      useCase.execute('00000000-0000-4000-8000-000000000000', 'user-1', {
        buffer: PNG,
        mimeType: 'image/png',
        filename: 'diagram.png',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
