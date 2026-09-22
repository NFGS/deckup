import { beforeEach, describe, expect, it } from 'vitest';

import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { FakeCardGenerator } from '../../testing/fakes/fake-card-generator.fake.js';
import { GenerateCardsUseCase } from './generate-cards.use-case.js';

const REQUEST = { notes: 'Mitosis is a type of cell division.', maxCards: 5 };

describe('GenerateCardsUseCase', () => {
  let generator: FakeCardGenerator;
  let useCase: GenerateCardsUseCase;

  beforeEach(() => {
    generator = new FakeCardGenerator();
    useCase = new GenerateCardsUseCase(generator);
  });

  it('returns the generated drafts', async () => {
    const suggestions = await useCase.execute(REQUEST);

    expect(suggestions).toEqual([{ front: 'Q1', back: 'A1', hint: null }]);
    expect(generator.lastRequest).toEqual({ notes: REQUEST.notes, maxCards: 5 });
  });

  it('never returns more cards than requested', async () => {
    generator.cards = Array.from({ length: 8 }, (_, index) => ({
      front: `Q${index}`,
      back: `A${index}`,
      hint: null,
    }));

    const suggestions = await useCase.execute({ ...REQUEST, maxCards: 3 });

    expect(suggestions).toHaveLength(3);
  });

  it('fails with a service error when no provider is configured', async () => {
    generator.isEnabled = false;

    await expect(useCase.execute(REQUEST)).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(generator.lastRequest).toBeNull();
  });
});
