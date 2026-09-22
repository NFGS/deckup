import { Module } from '@nestjs/common';

import { CreateCardUseCase } from './application/cards/create-card.use-case.js';
import { DeleteCardUseCase } from './application/cards/delete-card.use-case.js';
import { GetCardUseCase } from './application/cards/get-card.use-case.js';
import { ListCardsUseCase } from './application/cards/list-cards.use-case.js';
import { UpdateCardUseCase } from './application/cards/update-card.use-case.js';
import { CardsController } from './presentation/cards.controller.js';

@Module({
  controllers: [CardsController],
  providers: [
    CreateCardUseCase,
    ListCardsUseCase,
    GetCardUseCase,
    UpdateCardUseCase,
    DeleteCardUseCase,
  ],
})
export class CardsModule {}
