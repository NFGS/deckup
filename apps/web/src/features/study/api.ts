import {
  queueResponseSchema,
  reviewResultSchema,
  sessionSummarySchema,
  studySessionSchema,
  submitReviewSchema,
} from '@deckup/shared';
import type {
  QueueResponse,
  ReviewResult,
  SessionSummary,
  StudyMode,
  StudySession,
  SubmitReview,
} from '@deckup/shared';

import { apiRequest } from '../../lib/api-client';

export async function startStudySession(deckId: string, mode: StudyMode): Promise<StudySession> {
  return apiRequest(`/decks/${deckId}/study-sessions`, {
    method: 'POST',
    body: { mode },
    schema: studySessionSchema,
  });
}

export async function fetchStudyQueue(sessionId: string): Promise<QueueResponse> {
  return apiRequest(`/study-sessions/${sessionId}/queue`, { schema: queueResponseSchema });
}

export async function submitReview(sessionId: string, input: SubmitReview): Promise<ReviewResult> {
  return apiRequest(`/study-sessions/${sessionId}/reviews`, {
    method: 'POST',
    body: submitReviewSchema.parse(input),
    schema: reviewResultSchema,
  });
}

export async function completeStudySession(sessionId: string): Promise<SessionSummary> {
  return apiRequest(`/study-sessions/${sessionId}/complete`, {
    method: 'POST',
    schema: sessionSummarySchema,
  });
}

export async function abandonStudySession(sessionId: string): Promise<StudySession> {
  return apiRequest(`/study-sessions/${sessionId}/abandon`, {
    method: 'POST',
    schema: studySessionSchema,
  });
}
