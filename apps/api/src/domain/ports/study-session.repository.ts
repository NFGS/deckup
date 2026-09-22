import type { StudyMode } from '@deckup/shared';

import type { StudySession } from '../entities/study-session.entity.js';

export abstract class StudySessionRepositoryPort {
  abstract create(session: StudySession): Promise<void>;
  abstract findByIdForUser(id: string, userId: string): Promise<StudySession | null>;
  /** Active session for a deck and mode, used to resume interrupted sessions (E3). */
  abstract findActiveForDeck(
    userId: string,
    deckId: string,
    mode: StudyMode,
  ): Promise<StudySession | null>;
  abstract update(session: StudySession): Promise<void>;
}
