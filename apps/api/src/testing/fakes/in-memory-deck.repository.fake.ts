import type { Deck } from '../../domain/entities/deck.entity.js';
import { DeckRepositoryPort } from '../../domain/ports/deck.repository.js';
import type {
  DeckListFilters,
  DeckListResult,
  DeckWithCounts,
  PublicDeckListFilters,
  PublicDeckListResult,
  PublicDeckWithAuthor,
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

  async listSubjects(ownerId: string): Promise<string[]> {
    const subjects = new Set<string>();

    for (const deck of this.decks.values()) {
      if (deck.ownerId === ownerId && !deck.isDeleted && deck.subject) {
        subjects.add(deck.subject);
      }
    }

    return Promise.resolve([...subjects].sort((left, right) => left.localeCompare(right)));
  }

  async listByOwner(
    ownerId: string,
    filters: DeckListFilters,
    pagination: PaginationQuery,
  ): Promise<DeckListResult> {
    const matches = (deck: Deck): boolean =>
      deck.ownerId === ownerId &&
      !deck.isDeleted &&
      (filters.subject === undefined || deck.subject === filters.subject) &&
      (filters.tag === undefined || deck.tags.includes(filters.tag)) &&
      (filters.search === undefined ||
        deck.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        (deck.description?.toLowerCase().includes(filters.search.toLowerCase()) ?? false));

    const items = [...this.decks.values()]
      .filter(matches)
      .map((deck) => ({ deck, cardCount: 0, dueCount: 0 }));

    return Promise.resolve({
      items: items.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize,
      ),
      total: items.length,
    });
  }

  async listPublic(
    filters: PublicDeckListFilters,
    pagination: PaginationQuery,
  ): Promise<PublicDeckListResult> {
    const matches = (deck: Deck): boolean =>
      deck.visibility === 'PUBLIC' &&
      !deck.isDeleted &&
      (filters.subject === undefined || deck.subject === filters.subject) &&
      (filters.search === undefined ||
        deck.title.toLowerCase().includes(filters.search.toLowerCase()));

    const items = [...this.decks.values()]
      .filter(matches)
      .map((deck) => ({ deck, cardCount: 0, dueCount: 0, authorName: 'Fake Author' }));

    return Promise.resolve({
      items: items.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize,
      ),
      total: items.length,
    });
  }

  async findPublicById(id: string): Promise<PublicDeckWithAuthor | null> {
    const deck = this.decks.get(id);

    if (!deck || deck.visibility !== 'PUBLIC' || deck.isDeleted) {
      return Promise.resolve(null);
    }

    return Promise.resolve({ deck, cardCount: 0, dueCount: 0, authorName: 'Fake Author' });
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
