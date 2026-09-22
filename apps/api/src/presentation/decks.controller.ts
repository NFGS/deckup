import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { createDeckSchema, deckListQuerySchema, updateDeckSchema } from '@deckup/shared';
import type {
  AccessTokenPayload,
  CreateDeck,
  Deck as DeckResponse,
  DeckListQuery,
  Page,
  UpdateDeck,
} from '@deckup/shared';

import { CreateDeckUseCase } from '../application/decks/create-deck.use-case.js';
import { DeleteDeckUseCase } from '../application/decks/delete-deck.use-case.js';
import { GetDeckUseCase } from '../application/decks/get-deck.use-case.js';
import { ListDecksUseCase } from '../application/decks/list-decks.use-case.js';
import { UpdateDeckUseCase } from '../application/decks/update-deck.use-case.js';
import { CurrentUser } from './common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import { toDeckPage, toDeckResponse } from './common/presenters/deck.presenter.js';

const listQuery = new ZodValidationPipe(deckListQuerySchema);
const createBody = new ZodValidationPipe(createDeckSchema);
const updateBody = new ZodValidationPipe(updateDeckSchema);

@Controller('decks')
export class DecksController {
  constructor(
    private readonly createDeck: CreateDeckUseCase,
    private readonly listDecks: ListDecksUseCase,
    private readonly getDeck: GetDeckUseCase,
    private readonly updateDeck: UpdateDeckUseCase,
    private readonly deleteDeck: DeleteDeckUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query(listQuery) query: DeckListQuery,
  ): Promise<Page<DeckResponse>> {
    const result = await this.listDecks.execute(user.sub, query);
    return toDeckPage(result.items, query.page, query.pageSize, result.total);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(createBody) body: CreateDeck,
  ): Promise<DeckResponse> {
    return toDeckResponse(await this.createDeck.execute(user.sub, body));
  }

  @Get(':deckId')
  async detail(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
  ): Promise<DeckResponse> {
    return toDeckResponse(await this.getDeck.execute(deckId, user.sub));
  }

  @Patch(':deckId')
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Body(updateBody) body: UpdateDeck,
  ): Promise<DeckResponse> {
    return toDeckResponse(await this.updateDeck.execute(deckId, user.sub, body));
  }

  @Delete(':deckId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
  ): Promise<void> {
    await this.deleteDeck.execute(deckId, user.sub);
  }
}
