import { Module } from '@nestjs/common';

import { ExportDeckUseCase } from './application/cards/export-deck.use-case.js';
import { ImportCardsUseCase } from './application/cards/import-cards.use-case.js';
import { ImportsController } from './presentation/imports.controller.js';

@Module({
  controllers: [ImportsController],
  providers: [ImportCardsUseCase, ExportDeckUseCase],
})
export class ImportsModule {}
