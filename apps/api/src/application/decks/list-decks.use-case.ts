import { Inject, Injectable } from '@nestjs/common';
import type { DeckListQuery } from '@deckup/shared';

import type { DeckListResult } from '../../domain/ports/deck.repository.js';
import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';

@Injectable()
export class ListDecksUseCase {
  constructor(@Inject(DeckRepository) private readonly decks: DeckRepositoryPort) {}

  async execute(ownerId: string, query: DeckListQuery): Promise<DeckListResult> {
    return this.decks.listByOwner(
      ownerId,
      { subject: query.subject, tag: query.tag, search: query.q },
      { page: query.page, pageSize: query.pageSize },
    );
  }
}
