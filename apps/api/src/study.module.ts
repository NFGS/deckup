import { Module } from '@nestjs/common';

import { AbandonStudySessionUseCase } from './application/study/abandon-study-session.use-case.js';
import { CompleteStudySessionUseCase } from './application/study/complete-study-session.use-case.js';
import { GetStudyQueueUseCase } from './application/study/get-study-queue.use-case.js';
import { StartStudySessionUseCase } from './application/study/start-study-session.use-case.js';
import { SubmitReviewUseCase } from './application/study/submit-review.use-case.js';
import { StudyController } from './presentation/study.controller.js';

@Module({
  controllers: [StudyController],
  providers: [
    StartStudySessionUseCase,
    GetStudyQueueUseCase,
    SubmitReviewUseCase,
    CompleteStudySessionUseCase,
    AbandonStudySessionUseCase,
  ],
})
export class StudyModule {}
