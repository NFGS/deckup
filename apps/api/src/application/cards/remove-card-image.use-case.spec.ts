import { beforeEach, describe, expect, it } from 'vitest';

import { Card } from '../../domain/entities/card.entity.js';
import { FakeImageStorage } from '../../testing/fakes/fake-image-storage.fake.js';
import { InMemoryCardRepository } from '../../testing/fakes/in-memory-card.repository.fake.js';
import { RemoveCardImageUseCase } from './remove-card-image.use-case.js';

describe('RemoveCardImageUseCase', () => {
  let cards: InMemoryCardRepository;
  let images: FakeImageStorage;
  let useCase: RemoveCardImageUseCase;
  let card: Card;

  beforeEach(async () => {
    cards = new InMemoryCardRepository();
    images = new FakeImageStorage();
    useCase = new RemoveCardImageUseCase(cards, images);
    card = Card.create({
      deckId: 'deck-1',
      front: 'Question',
      back: 'Answer',
      imageUrl: 'https://cdn.test/fake/card.png',
      imagePublicId: 'deckup/cards/card',
    });
    await cards.create(card);
    cards.registerDeckOwner('deck-1', 'user-1');
  });

  it('removes the asset and clears both references', async () => {
    const updated = await useCase.execute(card.id, 'user-1');

    expect(updated.imageUrl).toBeNull();
    expect(updated.imagePublicId).toBeNull();
    expect(images.removed).toEqual(['deckup/cards/card']);
    expect((await cards.findByIdForOwner(card.id, 'user-1'))?.imageUrl).toBeNull();
  });

  it('is idempotent when the card has no image', async () => {
    const plain = Card.create({ deckId: 'deck-1', front: 'Q', back: 'A' });
    await cards.create(plain);

    const updated = await useCase.execute(plain.id, 'user-1');

    expect(updated.imageUrl).toBeNull();
    expect(images.removed).toHaveLength(0);
  });

  it('returns not found for an unknown card', async () => {
    await expect(
      useCase.execute('00000000-0000-4000-8000-000000000000', 'user-1'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
