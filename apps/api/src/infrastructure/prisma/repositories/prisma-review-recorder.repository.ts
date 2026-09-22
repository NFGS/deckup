import { Injectable } from '@nestjs/common';

import { ReviewRecorderPort } from '../../../domain/ports/review-recorder.port.js';
import type { ReviewRecording } from '../../../domain/ports/review-recorder.port.js';
import { toReviewLogData } from '../mappers/review-log.mapper.js';
import { toReviewStateData } from '../mappers/review-state.mapper.js';
import { toStudySessionData } from '../mappers/study-session.mapper.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaReviewRecorder extends ReviewRecorderPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async record({ state, log, session }: ReviewRecording): Promise<void> {
    const stateData = toReviewStateData(state);

    await this.prisma.$transaction([
      this.prisma.reviewState.upsert({
        where: { cardId: state.cardId },
        create: {
          cardId: state.cardId,
          ...stateData,
          createdAt: state.createdAt,
          updatedAt: state.updatedAt,
        },
        update: stateData,
      }),
      this.prisma.reviewLog.create({ data: toReviewLogData(log) }),
      this.prisma.studySession.update({
        where: { id: session.id },
        data: toStudySessionData(session),
      }),
    ]);
  }
}
