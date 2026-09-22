import type { Deck } from '../entities/deck.entity.js';
import type { PaginationQuery } from '@deckup/shared';

export interface DeckListFilters {
  subject?: string;
  tag?: string;
  search?: string;
}

export interface DeckWithCounts {
  deck: Deck;
  cardCount: number;
  dueCount: number;
}

export interface DeckListResult {
  items: DeckWithCounts[];
  total: number;
}

export abstract class DeckRepositoryPort {
  abstract create(deck: Deck): Promise<void>;
  abstract findByIdForOwner(id: string, ownerId: string): Promise<DeckWithCounts | null>;
  abstract listByOwner(
    ownerId: string,
    filters: DeckListFilters,
    pagination: PaginationQuery,
  ): Promise<DeckListResult>;
  abstract update(deck: Deck): Promise<void>;
  abstract softDelete(id: string, ownerId: string, now: Date): Promise<void>;
}
