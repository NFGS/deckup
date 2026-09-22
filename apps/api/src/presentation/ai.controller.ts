import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { cardSuggestionRequestSchema } from '@deckup/shared';
import type { CardSuggestionRequest, CardSuggestionResponse } from '@deckup/shared';

import { GenerateCardsUseCase } from '../application/ai/generate-cards.use-case.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';

@Controller('ai')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class AiController {
  constructor(private readonly generateCards: GenerateCardsUseCase) {}

  @Post('card-suggestions')
  @HttpCode(HttpStatus.OK)
  async suggest(
    @Body(new ZodValidationPipe(cardSuggestionRequestSchema)) body: CardSuggestionRequest,
  ): Promise<CardSuggestionResponse> {
    return { suggestions: await this.generateCards.execute(body) };
  }
}
