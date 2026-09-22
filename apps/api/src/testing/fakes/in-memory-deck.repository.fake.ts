import type { Deck } from '../../domain/entities/deck.entity.js';
import { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';
import type {
  DeckListFilters,
  DeckListResult,
  DeckWithCounts,
} from '../../domain/ports/deck.repository.js';
import type { PaginationQuery } from '@deckup/shared';

export class InMemoryDeckRepository extends DeckRepositoryPort {
  private readonly decks = new Map<string, Deck>();

  async create(deck: Deck): Promise<void> {
    this.decks.set(deck.id, deck);
    return Promise.resolve();
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<DeckWithCounts | null> {
    const deck = this.decks.get(id);

    if (!deck || deck.ownerId !== ownerId || deck.isDeleted) {
      return Promise.resolve(null);
    }

    return Promise.resolve({ deck, cardCount: 0, dueCount: 0 });
  }

  async listByOwner(
    ownerId: string,
    _filters: DeckListFilters,
    pagination: PaginationQuery,
  ): Promise<DeckListResult> {
    const items = [...this.decks.values()]
      .filter((deck) => deck.ownerId === ownerId && !deck.isDeleted)
      .map((deck) => ({ deck, cardCount: 0, dueCount: 0 }));

    return Promise.resolve({
      items: items.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize,
      ),
      total: items.length,
    });
  }

  async update(deck: Deck): Promise<void> {
    this.decks.set(deck.id, deck);
    return Promise.resolve();
  }

  async softDelete(id: string, ownerId: string, now: Date): Promise<void> {
    const deck = this.decks.get(id);

    if (deck && deck.ownerId === ownerId) {
      this.decks.set(id, deck.markDeleted(now));
    }

    return Promise.resolve();
  }
}
