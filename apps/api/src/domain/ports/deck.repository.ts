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

export interface PublicDeckWithAuthor extends DeckWithCounts {
  authorName: string;
}

export interface PublicDeckListFilters {
  search?: string;
  subject?: string;
}

export interface PublicDeckListResult {
  items: PublicDeckWithAuthor[];
  total: number;
}

export abstract class DeckRepositoryPort {
  abstract create(deck: Deck): Promise<void>;
  abstract findByIdForOwner(id: string, ownerId: string): Promise<DeckWithCounts | null>;
  /** Distinct non-empty subjects across the owner's active decks. */
  abstract listSubjects(ownerId: string): Promise<string[]>;
  abstract listByOwner(
    ownerId: string,
    filters: DeckListFilters,
    pagination: PaginationQuery,
  ): Promise<DeckListResult>;
  abstract listPublic(
    filters: PublicDeckListFilters,
    pagination: PaginationQuery,
  ): Promise<PublicDeckListResult>;
  abstract findPublicById(id: string): Promise<PublicDeckWithAuthor | null>;
  abstract update(deck: Deck): Promise<void>;
  abstract softDelete(id: string, ownerId: string, now: Date): Promise<void>;
}
