import { Inject, Injectable } from '@nestjs/common';
import type { StartStudySession } from '@deckup/shared';

import { StudySession } from '../../domain/entities/study-session.entity.js';
import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';
import { StudySessionRepositoryPort as StudySessionRepository } from '../../domain/ports/study-session.repository.js';
import type { StudySessionRepositoryPort } from '../../domain/ports/study-session.repository.js';

@Injectable()
export class StartStudySessionUseCase {
  constructor(
    @Inject(DeckRepository) private readonly decks: DeckRepositoryPort,
    @Inject(StudySessionRepository) private readonly sessions: StudySessionRepositoryPort,
  ) {}

  async execute(deckId: string, userId: string, input: StartStudySession): Promise<StudySession> {
    const deck = await this.decks.findByIdForOwner(deckId, userId);
    if (!deck) {
      throw new NotFoundError('Deck', deckId);
    }

    const active = await this.sessions.findActiveForDeck(userId, deckId, input.mode);
    if (active) {
      return active;
    }

    const session = StudySession.start({ userId, deckId, mode: input.mode });
    await this.sessions.create(session);

    return session;
  }
}
