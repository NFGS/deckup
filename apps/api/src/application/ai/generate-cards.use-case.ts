import { Inject, Injectable } from '@nestjs/common';
import type { CardSuggestionRequest } from '@deckup/shared';

import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { CardGeneratorPort as CardGenerator } from '../../domain/ports/card-generator.port.js';
import type { CardGeneratorPort, GeneratedCard } from '../../domain/ports/card-generator.port.js';

@Injectable()
export class GenerateCardsUseCase {
  constructor(@Inject(CardGenerator) private readonly generator: CardGeneratorPort) {}

  async execute(input: CardSuggestionRequest): Promise<GeneratedCard[]> {
    if (!this.generator.isEnabled) {
      throw new ServiceUnavailableError('AI card generation is not configured on this deployment');
    }

    const suggestions = await this.generator.generate({
      notes: input.notes,
      maxCards: input.maxCards,
    });

    return suggestions.slice(0, input.maxCards);
  }
}
