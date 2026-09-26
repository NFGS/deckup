import { Injectable } from '@nestjs/common';

import { isSuccessfulRating } from '../../../domain/entities/study-session.entity.js';
import { ReviewRecorderPort } from '../../../domain/ports/review-recorder.port.js';
import type {
  ReviewRecording,
  ReviewRecordingResult,
} from '../../../domain/ports/review-recorder.port.js';
import { toReviewLogData } from '../mappers/review-log.mapper.js';
import { toReviewStateData } from '../mappers/review-state.mapper.js';
import { PrismaService } from '../prisma.service.js';

class StaleReviewStateError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class PrismaReviewRecorder extends ReviewRecorderPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async record({
    state,
    log,
    session,
    expectedVersion,
  }: ReviewRecording): Promise<ReviewRecordingResult> {
    const stateData = toReviewStateData(state);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.reviewLog.create({ data: toReviewLogData(log) });

        const updated = await tx.reviewState.updateMany({
          where: { cardId: state.cardId, version: expectedVersion },
          data: stateData,
        });

        if (updated.count === 0) {
          if (expectedVersion !== 0) {
            throw new StaleReviewStateError();
          }

          try {
            await tx.reviewState.create({
              data: {
                cardId: state.cardId,
                ...stateData,
                createdAt: state.createdAt,
                updatedAt: state.updatedAt,
              },
            });
          } catch (error) {
            if (isUniqueViolation(error)) {
              throw new StaleReviewStateError();
            }
            throw error;
          }
        }

        await tx.studySession.update({
          where: { id: session.id },
          data: {
            cardsReviewed: { increment: 1 },
            correctCount: { increment: isSuccessfulRating(log.rating) ? 1 : 0 },
          },
        });
      });

      return { status: 'recorded' };
    } catch (error) {
      if (error instanceof StaleReviewStateError) {
        return { status: 'stale' };
      }

      if (isUniqueViolation(error)) {
        return { status: 'duplicate' };
      }

      throw error;
    }
  }
}
