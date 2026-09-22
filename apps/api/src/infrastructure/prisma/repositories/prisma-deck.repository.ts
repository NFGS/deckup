import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { PaginationQuery } from '@deckup/shared';

import type { Deck } from '../../../domain/entities/deck.entity.js';
import { DeckRepositoryPort } from '../../../domain/ports/deck.repository.js';
import type {
  DeckListFilters,
  DeckListResult,
  DeckWithCounts,
} from '../../../domain/ports/deck.repository.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { toDeckWithCounts } from '../mappers/deck.mapper.js';
import type { DeckRow } from '../mappers/deck.mapper.js';
import { PrismaService } from '../prisma.service.js';

const DECK_INCLUDE = {
  deckTags: { include: { tag: true } },
  _count: { select: { cards: { where: { deletedAt: null } } } },
} as const;

@Injectable()
export class PrismaDeckRepository extends DeckRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(deck: Deck): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.deck.create({
        data: {
          id: deck.id,
          ownerId: deck.ownerId,
          title: deck.title,
          description: deck.description,
          subject: deck.subject,
          color: deck.color,
          visibility: deck.visibility,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
        },
      });

      await this.replaceTags(tx, deck.id, deck.ownerId, deck.tags);
    });
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<DeckWithCounts | null> {
    const row = await this.prisma.deck.findFirst({
      where: { id, ownerId, deletedAt: null },
      include: DECK_INCLUDE,
    });

    return row ? toDeckWithCounts(row) : null;
  }

  async listByOwner(
    ownerId: string,
    filters: DeckListFilters,
    pagination: PaginationQuery,
  ): Promise<DeckListResult> {
    const where: Prisma.DeckWhereInput = {
      ownerId,
      deletedAt: null,
      ...(filters.subject ? { subject: filters.subject } : {}),
      ...(filters.tag ? { deckTags: { some: { tag: { name: filters.tag.toLowerCase() } } } } : {}),
      ...(filters.search ? { title: { contains: filters.search, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.deck.findMany({
        where,
        include: DECK_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.deck.count({ where }),
    ]);

    return {
      items: rows.map((row) => toDeckWithCounts(row as DeckRow)),
      total,
    };
  }

  async update(deck: Deck): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.deck.update({
        where: { id: deck.id },
        data: {
          title: deck.title,
          description: deck.description,
          subject: deck.subject,
          color: deck.color,
          visibility: deck.visibility,
          updatedAt: deck.updatedAt,
        },
      });

      await this.replaceTags(tx, deck.id, deck.ownerId, deck.tags);
    });
  }

  async softDelete(id: string, ownerId: string, now: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.deck.updateMany({
        where: { id, ownerId, deletedAt: null },
        data: { deletedAt: now, updatedAt: now },
      }),
      this.prisma.card.updateMany({
        where: { deckId: id, deletedAt: null },
        data: { deletedAt: now, updatedAt: now },
      }),
    ]);
  }

  private async replaceTags(
    tx: Prisma.TransactionClient,
    deckId: string,
    ownerId: string,
    tags: string[],
  ): Promise<void> {
    await tx.deckTag.deleteMany({ where: { deckId } });

    for (const name of tags) {
      const tag = await tx.tag.upsert({
        where: { ownerId_name: { ownerId, name } },
        create: { id: randomUUID(), ownerId, name },
        update: {},
      });

      await tx.deckTag.create({ data: { deckId, tagId: tag.id } });
    }
  }
}
