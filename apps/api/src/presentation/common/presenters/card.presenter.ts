import type { Card as CardResponse, Page } from '@deckup/shared';

import type { Card } from '../../../domain/entities/card.entity.js';

export function toCardResponse(card: Card): CardResponse {
  return {
    id: card.id,
    deckId: card.deckId,
    front: card.front,
    back: card.back,
    hint: card.hint,
    imageUrl: card.imageUrl,
    difficulty: card.difficulty,
    tags: card.tags,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export function toCardPage(
  items: Card[],
  page: number,
  pageSize: number,
  total: number,
): Page<CardResponse> {
  return { items: items.map(toCardResponse), page, pageSize, total };
}
