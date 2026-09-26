import type {
  QueueResponse,
  ReviewResult,
  SessionSummary,
  StudySession as StudySessionResponse,
} from '@deckup/shared';

import type { SessionSummaryResult } from '../../../application/study/complete-study-session.use-case.js';
import type { StudyQueueResult } from '../../../application/study/get-study-queue.use-case.js';
import type { ReviewOutcome } from '../../../application/study/submit-review.use-case.js';
import type { StudySession } from '../../../domain/entities/study-session.entity.js';

export function toStudySessionResponse(session: StudySession): StudySessionResponse {
  return {
    id: session.id,
    deckId: session.deckId,
    mode: session.mode,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    cardsReviewed: session.cardsReviewed,
    correctCount: session.correctCount,
  };
}

export function toQueueResponse(result: StudyQueueResult): QueueResponse {
  return {
    sessionId: result.sessionId,
    items: result.entries.map(({ card, state }) => ({
      cardId: card.id,
      front: card.front,
      back: card.back,
      hint: card.hint,
      imageUrl: card.imageUrl,
      state: state?.state ?? 'NEW',
      dueAt: (state?.dueAt ?? card.createdAt).toISOString(),
      isNew: state?.isNew ?? true,
    })),
    limit: result.limit,
    remaining: result.remaining,
  };
}

export function toReviewResult(outcome: ReviewOutcome): ReviewResult {
  return {
    cardId: outcome.cardId,
    rating: outcome.rating,
    nextDueAt: outcome.nextDueAt.toISOString(),
    scheduledDays: outcome.scheduledDays,
    state: outcome.state,
    remaining: outcome.remaining,
  };
}

export function toSessionSummary(result: SessionSummaryResult): SessionSummary {
  return {
    sessionId: result.sessionId,
    cardsReviewed: result.cardsReviewed,
    correctCount: result.correctCount,
    accuracy: result.accuracy,
    elapsedSeconds: result.elapsedSeconds,
  };
}
