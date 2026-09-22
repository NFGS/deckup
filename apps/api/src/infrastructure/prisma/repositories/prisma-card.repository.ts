import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { PaginationQuery } from '@deckup/shared';

import type { Card } from '../../../domain/entities/card.entity.js';
import { CardRepositoryPort } from '../../../domain/ports/card.repository.js';
import type { CardListResult } from '../../../domain/ports/card.repository.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { toDomainCard } from '../mappers/card.mapper.js';
import { PrismaService } from '../prisma.service.js';

const CARD_INCLUDE = { cardTags: { include: { tag: true } } } as const;

@Injectable()
export class PrismaCardRepository extends CardRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(card: Card): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const deck = await tx.deck.findUniqueOrThrow({
        where: { id: card.deckId },
        select: { ownerId: true },
      });

      await tx.card.create({
        data: {
          id: card.id,
          deckId: card.deckId,
          front: card.front,
          back: card.back,
          hint: card.hint,
          imageUrl: card.imageUrl,
          imagePublicId: card.imagePublicId,
          difficulty: card.difficulty,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        },
      });

      await tx.reviewState.create({
        data: {
          cardId: card.id,
          userId: deck.ownerId,
          dueAt: card.createdAt,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        },
      });

      await this.replaceTags(tx, card, deck.ownerId);
    });
  }

  async createMany(cards: Card[]): Promise<void> {
    const first = cards[0];

    if (!first) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const deck = await tx.deck.findUniqueOrThrow({
        where: { id: first.deckId },
        select: { ownerId: true },
      });

      await tx.card.createMany({
        data: cards.map((card) => ({
          id: card.id,
          deckId: card.deckId,
          front: card.front,
          back: card.back,
          hint: card.hint,
          imageUrl: card.imageUrl,
          imagePublicId: card.imagePublicId,
          difficulty: card.difficulty,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        })),
      });

      await tx.reviewState.createMany({
        data: cards.map((card) => ({
          cardId: card.id,
          userId: deck.ownerId,
          dueAt: card.createdAt,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        })),
      });

      await this.linkTags(tx, cards, deck.ownerId);
    });
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<Card | null> {
    const row = await this.prisma.card.findFirst({
      where: { id, deletedAt: null, deck: { ownerId, deletedAt: null } },
      include: CARD_INCLUDE,
    });

    return row ? toDomainCard(row) : null;
  }

  async listByDeck(
    deckId: string,
    search: string | undefined,
    pagination: PaginationQuery,
  ): Promise<CardListResult> {
    const where: Prisma.CardWhereInput = {
      deckId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { front: { contains: search, mode: 'insensitive' } },
              { back: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.card.findMany({
        where,
        include: CARD_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.card.count({ where }),
    ]);

    return {
      items: rows.map((row) => toDomainCard(row)),
      total,
    };
  }

  async findAllByDeck(deckId: string): Promise<Card[]> {
    const rows = await this.prisma.card.findMany({
      where: { deckId, deletedAt: null },
      include: CARD_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => toDomainCard(row));
  }

  async update(card: Card): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const deck = await tx.deck.findUniqueOrThrow({
        where: { id: card.deckId },
        select: { ownerId: true },
      });

      await tx.card.update({
        where: { id: card.id },
        data: {
          front: card.front,
          back: card.back,
          hint: card.hint,
          imageUrl: card.imageUrl,
          imagePublicId: card.imagePublicId,
          difficulty: card.difficulty,
          updatedAt: card.updatedAt,
        },
      });

      await this.replaceTags(tx, card, deck.ownerId);
    });
  }

  async softDelete(id: string, ownerId: string, now: Date): Promise<void> {
    await this.prisma.card.updateMany({
      where: { id, deletedAt: null, deck: { ownerId } },
      data: { deletedAt: now, updatedAt: now },
    });
  }

  private async replaceTags(
    tx: Prisma.TransactionClient,
    card: Card,
    ownerId: string,
  ): Promise<void> {
    await tx.cardTag.deleteMany({ where: { cardId: card.id } });

    for (const name of card.tags) {
      const tag = await tx.tag.upsert({
        where: { ownerId_name: { ownerId, name } },
        create: { id: randomUUID(), ownerId, name },
        update: {},
      });

      await tx.cardTag.create({ data: { cardId: card.id, tagId: tag.id } });
    }
  }

  private async linkTags(
    tx: Prisma.TransactionClient,
    cards: Card[],
    ownerId: string,
  ): Promise<void> {
    const uniqueNames = [...new Set(cards.flatMap((card) => card.tags))];

    if (uniqueNames.length === 0) {
      return;
    }

    await tx.tag.createMany({
      data: uniqueNames.map((name) => ({ id: randomUUID(), ownerId, name })),
      skipDuplicates: true,
    });

    const tags = await tx.tag.findMany({
      where: { ownerId, name: { in: uniqueNames } },
      select: { id: true, name: true },
    });
    const tagIdByName = new Map(tags.map((tag) => [tag.name, tag.id]));

    const links = cards.flatMap((card) =>
      card.tags.flatMap((name) => {
        const tagId = tagIdByName.get(name);
        return tagId ? [{ cardId: card.id, tagId }] : [];
      }),
    );

    if (links.length > 0) {
      await tx.cardTag.createMany({ data: links, skipDuplicates: true });
    }
  }
}
