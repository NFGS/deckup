import type { StudySession } from '../entities/study-session.entity.js';

export abstract class StudySessionRepositoryPort {
  abstract create(session: StudySession): Promise<void>;
  abstract findByIdForUser(id: string, userId: string): Promise<StudySession | null>;
  abstract update(session: StudySession): Promise<void>;
}
