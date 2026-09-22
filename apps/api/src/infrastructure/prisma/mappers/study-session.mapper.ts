import type { SessionStatus, StudyMode } from '@deckup/shared';

import { StudySession } from '../../../domain/entities/study-session.entity.js';

export interface StudySessionRow {
  id: string;
  userId: string;
  deckId: string;
  mode: StudyMode;
  status: SessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  cardsReviewed: number;
  correctCount: number;
}

export function toDomainStudySession(row: StudySessionRow): StudySession {
  return StudySession.restore({ ...row });
}

export function toStudySessionData(session: StudySession) {
  return {
    mode: session.mode,
    status: session.status,
    endedAt: session.endedAt,
    cardsReviewed: session.cardsReviewed,
    correctCount: session.correctCount,
  };
}
