import { Module } from '@nestjs/common';

import { CloneDeckUseCase } from './application/decks/clone-deck.use-case.js';
import { ListPublicDecksUseCase } from './application/decks/list-public-decks.use-case.js';
import { PublicDecksController } from './presentation/public-decks.controller.js';

/**
 * Registered before DecksModule so `GET /decks/public` is matched before
 * the `GET /decks/:deckId` route of the private controller.
 */
@Module({
  controllers: [PublicDecksController],
  providers: [ListPublicDecksUseCase, CloneDeckUseCase],
})
export class PublicDecksModule {}
