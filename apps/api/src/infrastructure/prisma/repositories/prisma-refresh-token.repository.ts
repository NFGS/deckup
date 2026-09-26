import { Injectable } from '@nestjs/common';

import { RefreshTokenRepositoryPort } from '../../../domain/ports/refresh-token.repository.js';
import type { StoredRefreshToken } from '../../../domain/ports/refresh-token.repository.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(token: StoredRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        familyId: token.familyId,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        createdAt: token.createdAt,
      },
    });
  }

  async findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeByHash(tokenHash: string, revokedAt: Date): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt },
    });

    return result.count > 0;
  }

  async revokeFamily(familyId: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
