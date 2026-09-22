import type { Deck as DeckResponse, Page, PublicDeck as PublicDeckResponse } from '@deckup/shared';

import type {
  DeckWithCounts,
  PublicDeckWithAuthor,
} from '../../../domain/ports/deck.repository.js';

export function toDeckResponse(item: DeckWithCounts): DeckResponse {
  const { deck } = item;

  return {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    subject: deck.subject,
    color: deck.color,
    visibility: deck.visibility,
    tags: deck.tags,
    cardCount: item.cardCount,
    dueCount: item.dueCount,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}

export function toDeckPage(
  items: DeckWithCounts[],
  page: number,
  pageSize: number,
  total: number,
): Page<DeckResponse> {
  return { items: items.map(toDeckResponse), page, pageSize, total };
}

export function toPublicDeckResponse(item: PublicDeckWithAuthor): PublicDeckResponse {
  return {
    ...toDeckResponse(item),
    authorName: item.authorName,
  };
}

export function toPublicDeckPage(
  items: PublicDeckWithAuthor[],
  page: number,
  pageSize: number,
  total: number,
): Page<PublicDeckResponse> {
  return { items: items.map(toPublicDeckResponse), page, pageSize, total };
}
