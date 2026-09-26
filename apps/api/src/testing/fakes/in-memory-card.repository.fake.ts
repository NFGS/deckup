import type { PaginationQuery } from '@deckup/shared';

import type { Card } from '../../domain/entities/card.entity.js';
import { CardRepositoryPort } from '../../domain/ports/card.repository.js';
import type { CardListResult } from '../../domain/ports/card.repository.js';

export class InMemoryCardRepository extends CardRepositoryPort {
  readonly cards = new Map<string, Card>();

  private readonly deckOwners = new Map<string, string>();

  registerDeckOwner(deckId: string, ownerId: string): void {
    this.deckOwners.set(deckId, ownerId);
  }

  async create(card: Card): Promise<void> {
    this.cards.set(card.id, card);
    return Promise.resolve();
  }

  async createMany(cards: Card[]): Promise<void> {
    for (const card of cards) {
      this.cards.set(card.id, card);
    }
    return Promise.resolve();
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<Card | null> {
    const card = this.cards.get(id);

    if (!card || card.isDeleted) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.deckOwners.get(card.deckId) === ownerId ? card : null);
  }

  async listByDeck(
    deckId: string,
    search: string | undefined,
    pagination: PaginationQuery,
  ): Promise<CardListResult> {
    const matches = (card: Card): boolean =>
      card.deckId === deckId &&
      !card.isDeleted &&
      (search === undefined ||
        card.front.toLowerCase().includes(search.toLowerCase()) ||
        card.back.toLowerCase().includes(search.toLowerCase()));

    const items = [...this.cards.values()].filter(matches);

    return Promise.resolve({
      items: items.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize,
      ),
      total: items.length,
    });
  }

  async findAllByDeck(deckId: string): Promise<Card[]> {
    return Promise.resolve(
      [...this.cards.values()].filter((card) => card.deckId === deckId && !card.isDeleted),
    );
  }

  async update(card: Card): Promise<void> {
    this.cards.set(card.id, card);
    return Promise.resolve();
  }

  async softDelete(id: string, ownerId: string, now: Date): Promise<void> {
    const card = await this.findByIdForOwner(id, ownerId);

    if (card) {
      this.cards.set(id, card.markDeleted(now));
    }

    return Promise.resolve();
  }
}
