import type { Card } from '../entities/card.entity.js';
import type { PaginationQuery } from '@deckup/shared';

export interface CardListResult {
  items: Card[];
  total: number;
}

export abstract class CardRepositoryPort {
  abstract create(card: Card): Promise<void>;
  /** Bulk insert used by the CSV import (single transaction, NFR-03.2). */
  abstract createMany(cards: Card[]): Promise<void>;
  abstract findByIdForOwner(id: string, ownerId: string): Promise<Card | null>;
  abstract listByDeck(
    deckId: string,
    search: string | undefined,
    pagination: PaginationQuery,
  ): Promise<CardListResult>;
  /** Every card of a deck, ordered by creation, used by the CSV export. */
  abstract findAllByDeck(deckId: string): Promise<Card[]>;
  abstract update(card: Card): Promise<void>;
  abstract softDelete(id: string, ownerId: string, now: Date): Promise<void>;
}
