import { Module } from '@nestjs/common';

import { CreateDeckUseCase } from './application/decks/create-deck.use-case.js';
import { DeleteDeckUseCase } from './application/decks/delete-deck.use-case.js';
import { GetDeckUseCase } from './application/decks/get-deck.use-case.js';
import { ListDeckSubjectsUseCase } from './application/decks/list-deck-subjects.use-case.js';
import { ListDecksUseCase } from './application/decks/list-decks.use-case.js';
import { UpdateDeckUseCase } from './application/decks/update-deck.use-case.js';
import { DecksController } from './presentation/decks.controller.js';

@Module({
  controllers: [DecksController],
  providers: [
    CreateDeckUseCase,
    ListDecksUseCase,
    ListDeckSubjectsUseCase,
    GetDeckUseCase,
    UpdateDeckUseCase,
    DeleteDeckUseCase,
  ],
})
export class DecksModule {}
