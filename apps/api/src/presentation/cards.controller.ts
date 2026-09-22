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
  Req,
} from '@nestjs/common';
import {
  CARD_IMAGE_MAX_BYTES,
  cardListQuerySchema,
  createCardSchema,
  updateCardSchema,
} from '@deckup/shared';
import type {
  AccessTokenPayload,
  Card as CardResponse,
  CardListQuery,
  CreateCard,
  Page,
  UpdateCard,
} from '@deckup/shared';
import type { FastifyRequest } from 'fastify';

import { CreateCardUseCase } from '../application/cards/create-card.use-case.js';
import { DeleteCardUseCase } from '../application/cards/delete-card.use-case.js';
import { GetCardUseCase } from '../application/cards/get-card.use-case.js';
import { ListCardsUseCase } from '../application/cards/list-cards.use-case.js';
import { RemoveCardImageUseCase } from '../application/cards/remove-card-image.use-case.js';
import { UpdateCardUseCase } from '../application/cards/update-card.use-case.js';
import { UploadCardImageUseCase } from '../application/cards/upload-card-image.use-case.js';
import { ValidationError } from '../domain/errors/domain-errors.js';
import { CurrentUser } from './common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import { toCardPage, toCardResponse } from './common/presenters/card.presenter.js';

const listQuery = new ZodValidationPipe(cardListQuerySchema);
const createBody = new ZodValidationPipe(createCardSchema);
const updateBody = new ZodValidationPipe(updateCardSchema);

@Controller()
export class CardsController {
  constructor(
    private readonly createCard: CreateCardUseCase,
    private readonly listCards: ListCardsUseCase,
    private readonly getCard: GetCardUseCase,
    private readonly updateCard: UpdateCardUseCase,
    private readonly deleteCard: DeleteCardUseCase,
    private readonly uploadCardImage: UploadCardImageUseCase,
    private readonly removeCardImage: RemoveCardImageUseCase,
  ) {}

  @Get('decks/:deckId/cards')
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Query(listQuery) query: CardListQuery,
  ): Promise<Page<CardResponse>> {
    const result = await this.listCards.execute(deckId, user.sub, query);
    return toCardPage(result.items, query.page, query.pageSize, result.total);
  }

  @Post('decks/:deckId/cards')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Body(createBody) body: CreateCard,
  ): Promise<CardResponse> {
    return toCardResponse(await this.createCard.execute(deckId, user.sub, body));
  }

  @Get('cards/:cardId')
  async detail(
    @CurrentUser() user: AccessTokenPayload,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ): Promise<CardResponse> {
    return toCardResponse(await this.getCard.execute(cardId, user.sub));
  }

  @Patch('cards/:cardId')
  async update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body(updateBody) body: UpdateCard,
  ): Promise<CardResponse> {
    return toCardResponse(await this.updateCard.execute(cardId, user.sub, body));
  }

  @Post('cards/:cardId/image')
  async uploadImage(
    @CurrentUser() user: AccessTokenPayload,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Req() request: FastifyRequest,
  ): Promise<CardResponse> {
    const file = await request.file({ limits: { fileSize: CARD_IMAGE_MAX_BYTES, files: 1 } });

    if (!file) {
      throw new ValidationError('An image file is required', { field: 'file' });
    }

    const buffer = await file.toBuffer();

    return toCardResponse(
      await this.uploadCardImage.execute(cardId, user.sub, {
        buffer,
        mimeType: file.mimetype,
        filename: file.filename,
      }),
    );
  }

  @Delete('cards/:cardId/image')
  async removeImage(
    @CurrentUser() user: AccessTokenPayload,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ): Promise<CardResponse> {
    return toCardResponse(await this.removeCardImage.execute(cardId, user.sub));
  }

  @Delete('cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ): Promise<void> {
    await this.deleteCard.execute(cardId, user.sub);
  }
}
