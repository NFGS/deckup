import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { cloneDeckSchema, publicDeckListQuerySchema } from '@deckup/shared';
import type {
  AccessTokenPayload,
  CloneDeck,
  Deck as DeckResponse,
  Page,
  PublicDeck,
  PublicDeckListQuery,
} from '@deckup/shared';

import { CloneDeckUseCase } from '../application/decks/clone-deck.use-case.js';
import { ListPublicDecksUseCase } from '../application/decks/list-public-decks.use-case.js';
import { CurrentUser } from './common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import { toDeckResponse, toPublicDeckPage } from './common/presenters/deck.presenter.js';

@Controller('decks')
export class PublicDecksController {
  constructor(
    private readonly listPublicDecks: ListPublicDecksUseCase,
    private readonly cloneDeck: CloneDeckUseCase,
  ) {}

  @Get('public')
  async list(
    @Query(new ZodValidationPipe(publicDeckListQuerySchema)) query: PublicDeckListQuery,
  ): Promise<Page<PublicDeck>> {
    const result = await this.listPublicDecks.execute(query);
    return toPublicDeckPage(result.items, query.page, query.pageSize, result.total);
  }

  @Post(':deckId/clone')
  @HttpCode(HttpStatus.CREATED)
  async clone(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Body(new ZodValidationPipe(cloneDeckSchema)) body: CloneDeck,
  ): Promise<DeckResponse> {
    return toDeckResponse(await this.cloneDeck.execute(deckId, user.sub, body));
  }
}
