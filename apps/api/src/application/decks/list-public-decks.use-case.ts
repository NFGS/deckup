import { Inject, Injectable } from '@nestjs/common';
import type { PublicDeckListQuery } from '@deckup/shared';

import { DeckRepositoryPort as DeckRepository } from '../../domain/ports/deck.repository.js';
import type {
  DeckRepositoryPort,
  PublicDeckListResult,
} from '../../domain/ports/deck.repository.js';

@Injectable()
export class ListPublicDecksUseCase {
  constructor(@Inject(DeckRepository) private readonly decks: DeckRepositoryPort) {}

  async execute(query: PublicDeckListQuery): Promise<PublicDeckListResult> {
    return this.decks.listPublic(
      { search: query.q, subject: query.subject },
      { page: query.page, pageSize: query.pageSize },
    );
  }
}
