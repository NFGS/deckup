import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { PaginationQuery } from '@deckup/shared';

import type { Deck } from '../../../domain/entities/deck.entity.js';
import { DeckRepositoryPort } from '../../../domain/ports/deck.repository.js';
import type {
  DeckListFilters,
  DeckListResult,
  DeckWithCounts,
  PublicDeckListFilters,
  PublicDeckListResult,
  PublicDeckWithAuthor,
} from '../../../domain/ports/deck.repository.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { toDeckWithCounts, toPublicDeckWithAuthor } from '../mappers/deck.mapper.js';
import { PrismaService } from '../prisma.service.js';

const DECK_INCLUDE = {
  deckTags: { include: { tag: true } },
  _count: { select: { cards: { where: { deletedAt: null } } } },
} as const;

const PUBLIC_DECK_INCLUDE = {
  ...DECK_INCLUDE,
  owner: { select: { displayName: true } },
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

    if (!row) {
      return null;
    }

    const dueCount = await this.countDue(row.id, new Date());
    return toDeckWithCounts(row, dueCount);
  }

  async listSubjects(ownerId: string): Promise<string[]> {
    const rows = await this.prisma.deck.findMany({
      where: { ownerId, deletedAt: null, subject: { not: null } },
      select: { subject: true },
      distinct: ['subject'],
      orderBy: { subject: 'asc' },
    });

    return rows.map((row) => row.subject).filter((subject): subject is string => subject !== null);
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

    // Promise.all instead of $transaction: the Neon pooler can route the two
    // statements of a batch transaction to connections with different
    // snapshots, which returned `total > 0` with an empty `items` array.
    const [rows, total] = await Promise.all([
      this.prisma.deck.findMany({
        where,
        include: DECK_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.deck.count({ where }),
    ]);

    const dueCounts = await this.dueCountsByDeck(
      rows.map((row) => row.id),
      new Date(),
    );

    return {
      items: rows.map((row) => toDeckWithCounts(row, dueCounts.get(row.id) ?? 0)),
      total,
    };
  }

  async listPublic(
    filters: PublicDeckListFilters,
    pagination: PaginationQuery,
  ): Promise<PublicDeckListResult> {
    const where: Prisma.DeckWhereInput = {
      visibility: 'PUBLIC',
      deletedAt: null,
      ...(filters.subject ? { subject: filters.subject } : {}),
      ...(filters.search ? { title: { contains: filters.search, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.deck.findMany({
        where,
        include: PUBLIC_DECK_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.deck.count({ where }),
    ]);

    return {
      // The visitor has no schedule for these decks yet: due counts are theirs.
      items: rows.map((row) => toPublicDeckWithAuthor(row, 0)),
      total,
    };
  }

  async findPublicById(id: string): Promise<PublicDeckWithAuthor | null> {
    const row = await this.prisma.deck.findFirst({
      where: { id, visibility: 'PUBLIC', deletedAt: null },
      include: PUBLIC_DECK_INCLUDE,
    });

    return row ? toPublicDeckWithAuthor(row, 0) : null;
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

  private async countDue(deckId: string, now: Date): Promise<number> {
    return this.prisma.card.count({ where: { deckId, ...dueCondition(now) } });
  }

  private async dueCountsByDeck(deckIds: string[], now: Date): Promise<Map<string, number>> {
    if (deckIds.length === 0) {
      return new Map();
    }

    const grouped = await this.prisma.card.groupBy({
      by: ['deckId'],
      where: { deckId: { in: deckIds }, ...dueCondition(now) },
      _count: { _all: true },
    });

    return new Map(grouped.map((entry) => [entry.deckId, entry._count._all]));
  }
}

function dueCondition(now: Date): Prisma.CardWhereInput {
  return {
    deletedAt: null,
    OR: [{ reviewState: { is: null } }, { reviewState: { dueAt: { lte: now } } }],
  };
}
