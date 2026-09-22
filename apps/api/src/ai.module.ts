import { Module } from '@nestjs/common';

import { GenerateCardsUseCase } from './application/ai/generate-cards.use-case.js';
import { AiController } from './presentation/ai.controller.js';

@Module({
  controllers: [AiController],
  providers: [GenerateCardsUseCase],
})
export class AiModule {}
