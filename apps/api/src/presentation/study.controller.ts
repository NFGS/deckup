import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { startStudySessionSchema, submitReviewSchema } from '@deckup/shared';
import type {
  AccessTokenPayload,
  QueueResponse,
  ReviewResult,
  SessionSummary,
  StartStudySession,
  StudySession as StudySessionResponse,
  SubmitReview,
} from '@deckup/shared';

import { AbandonStudySessionUseCase } from '../application/study/abandon-study-session.use-case.js';
import { CompleteStudySessionUseCase } from '../application/study/complete-study-session.use-case.js';
import { GetStudyQueueUseCase } from '../application/study/get-study-queue.use-case.js';
import { StartStudySessionUseCase } from '../application/study/start-study-session.use-case.js';
import { SubmitReviewUseCase } from '../application/study/submit-review.use-case.js';
import { CurrentUser } from './common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import {
  toQueueResponse,
  toReviewResult,
  toSessionSummary,
  toStudySessionResponse,
} from './common/presenters/study.presenter.js';

const startBody = new ZodValidationPipe(startStudySessionSchema);
const reviewBody = new ZodValidationPipe(submitReviewSchema);

@Controller()
export class StudyController {
  constructor(
    private readonly startSession: StartStudySessionUseCase,
    private readonly getQueue: GetStudyQueueUseCase,
    private readonly submitReview: SubmitReviewUseCase,
    private readonly completeSession: CompleteStudySessionUseCase,
    private readonly abandonSession: AbandonStudySessionUseCase,
  ) {}

  @Post('decks/:deckId/study-sessions')
  @HttpCode(HttpStatus.CREATED)
  async start(
    @CurrentUser() user: AccessTokenPayload,
    @Param('deckId', ParseUUIDPipe) deckId: string,
    @Body(startBody) body: StartStudySession,
  ): Promise<StudySessionResponse> {
    return toStudySessionResponse(await this.startSession.execute(deckId, user.sub, body));
  }

  @Get('study-sessions/:sessionId/queue')
  async queue(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<QueueResponse> {
    return toQueueResponse(await this.getQueue.execute(sessionId, user.sub));
  }

  @Post('study-sessions/:sessionId/reviews')
  @HttpCode(HttpStatus.OK)
  async review(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body(reviewBody) body: SubmitReview,
  ): Promise<ReviewResult> {
    return toReviewResult(await this.submitReview.execute(sessionId, user.sub, body));
  }

  @Post('study-sessions/:sessionId/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionSummary> {
    return toSessionSummary(await this.completeSession.execute(sessionId, user.sub));
  }

  @Post('study-sessions/:sessionId/abandon')
  @HttpCode(HttpStatus.OK)
  async abandon(
    @CurrentUser() user: AccessTokenPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<StudySessionResponse> {
    return toStudySessionResponse(await this.abandonSession.execute(sessionId, user.sub));
  }
}
