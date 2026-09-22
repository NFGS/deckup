import type { CardDifficulty } from '@deckup/shared';

import { Card } from '../../../domain/entities/card.entity.js';

export interface CardRow {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  difficulty: CardDifficulty | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  cardTags: { tag: { name: string } }[];
}

export function toDomainCard(row: CardRow): Card {
  return Card.restore({
    id: row.id,
    deckId: row.deckId,
    front: row.front,
    back: row.back,
    hint: row.hint,
    imageUrl: row.imageUrl,
    imagePublicId: row.imagePublicId,
    difficulty: row.difficulty,
    tags: row.cardTags.map((cardTag) => cardTag.tag.name),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  });
}
