import { Inject, Injectable } from '@nestjs/common';

import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

@Injectable()
export class ListDeckSubjectsUseCase {
  constructor(@Inject(DeckRepository) private readonly decks: DeckRepositoryPort) {}

  execute(ownerId: string): Promise<string[]> {
    return this.decks.listSubjects(ownerId);
  }
}
