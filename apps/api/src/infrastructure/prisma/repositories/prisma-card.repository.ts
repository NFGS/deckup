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
}
