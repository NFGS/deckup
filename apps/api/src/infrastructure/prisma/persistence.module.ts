import { Global, Module } from '@nestjs/common';

import { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';
import { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.js';
import { ReviewLogRepositoryPort } from '../../domain/ports/review-log.repository.js';
import { ReviewRecorderPort } from '../../domain/ports/review-recorder.port.js';
import { ReviewStateRepositoryPort } from '../../domain/ports/review-state.repository.js';
import { StudyAnalyticsRepositoryPort } from '../../domain/ports/study-analytics.repository.js';
import { StudyQueueRepositoryPort } from '../../domain/ports/study-queue.repository.js';
import { StudySessionRepositoryPort } from '../../domain/ports/study-session.repository.js';
import { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import { PrismaCardRepository } from './repositories/prisma-card.repository.js';
import { PrismaDeckRepository } from './repositories/prisma-deck.repository.js';
import { PrismaRefreshTokenRepository } from './repositories/prisma-refresh-token.repository.js';
import { PrismaReviewLogRepository } from './repositories/prisma-review-log.repository.js';
import { PrismaReviewRecorder } from './repositories/prisma-review-recorder.repository.js';
import { PrismaReviewStateRepository } from './repositories/prisma-review-state.repository.js';
import { PrismaStudyAnalyticsRepository } from './repositories/prisma-study-analytics.repository.js';
import { PrismaStudyQueueRepository } from './repositories/prisma-study-queue.repository.js';
import { PrismaStudySessionRepository } from './repositories/prisma-study-session.repository.js';
import { PrismaUserRepository } from './repositories/prisma-user.repository.js';

@Global()
@Module({
  providers: [
    { provide: UserRepositoryPort, useClass: PrismaUserRepository },
    { provide: RefreshTokenRepositoryPort, useClass: PrismaRefreshTokenRepository },
    { provide: DeckRepositoryPort, useClass: PrismaDeckRepository },
    { provide: CardRepositoryPort, useClass: PrismaCardRepository },
    { provide: ReviewStateRepositoryPort, useClass: PrismaReviewStateRepository },
    { provide: ReviewLogRepositoryPort, useClass: PrismaReviewLogRepository },
    { provide: StudySessionRepositoryPort, useClass: PrismaStudySessionRepository },
    { provide: StudyQueueRepositoryPort, useClass: PrismaStudyQueueRepository },
    { provide: StudyAnalyticsRepositoryPort, useClass: PrismaStudyAnalyticsRepository },
    { provide: ReviewRecorderPort, useClass: PrismaReviewRecorder },
  ],
  exports: [
    UserRepositoryPort,
    RefreshTokenRepositoryPort,
    DeckRepositoryPort,
    CardRepositoryPort,
    ReviewStateRepositoryPort,
    ReviewLogRepositoryPort,
    StudySessionRepositoryPort,
    StudyQueueRepositoryPort,
    StudyAnalyticsRepositoryPort,
    ReviewRecorderPort,
  ],
})
export class PersistenceModule {}
