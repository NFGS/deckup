import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AccessTokenPayload, ImportSummary } from '@deckup/shared';

import { ExportDeckUseCase } from '../application/cards/export-deck.use-case.js';
import { ImportCardsUseCase } from '../application/cards/import-cards.use-case.js';
import { ValidationError } from '../domain/errors/domain-errors.js';
import { CurrentUser } from './common/decorators/current-user.decorator.js';

const MAX_FILE_BYTES = 1_048_576;

@Controller('decks/:deckId')
export class ImportsController {
  constructor(
    private readonly importCards: ImportCardsUseCase,
    private readonly exportDeck: ExportDeckUseCase,
  ) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async import(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Req() request: FastifyRequest,
  ): Promise<ImportSummary> {
    const file = await request.file();

    if (!file) {
      throw new ValidationError('A CSV file is required', { field: 'file' });
    }

    const buffer = await file.toBuffer();

    if (buffer.byteLength > MAX_FILE_BYTES) {
      throw new ValidationError('The CSV file must be at most 1 MB', { field: 'file' });
    }

    return this.importCards.execute(deckId, user.sub, buffer.toString('utf8'));
  }

  @Get('export')
  async export(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.exportDeck.execute(deckId, user.sub);

    void reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.csv);
  }
}
