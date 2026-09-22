import type { DeckVisibility } from '@deckup/shared';

import { Deck } from '../../../domain/entities/deck.entity.js';
import type { DeckWithCounts } from '../../../domain/ports/deck.repository.js';

export interface DeckRow {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  subject: string | null;
  color: string | null;
  visibility: DeckVisibility;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deckTags: { tag: { name: string } }[];
  _count: { cards: number };
}

export function toDomainDeck(row: DeckRow): Deck {
  return Deck.restore({
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    subject: row.subject,
    color: row.color,
    visibility: row.visibility,
    tags: row.deckTags.map((deckTag) => deckTag.tag.name),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  });
}

export function toDeckWithCounts(row: DeckRow, dueCount: number): DeckWithCounts {
  return {
    deck: toDomainDeck(row),
    cardCount: row._count.cards,
    dueCount,
  };
}
