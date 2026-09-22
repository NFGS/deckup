import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { User } from '../../domain/entities/user.entity.js';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.js';
import { RefreshTokenRepositoryPort as RefreshTokenRepository } from '../../domain/ports/refresh-token.repository.js';
import type { TokenServicePort } from '../../domain/ports/token-service.port.js';
import { TokenServicePort as TokenService } from '../../domain/ports/token-service.port.js';

export const REFRESH_TOKEN_TTL_DAYS = Symbol('REFRESH_TOKEN_TTL_DAYS');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface IssuedSession {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: User;
}

@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(TokenService) private readonly tokens: TokenServicePort,
    @Inject(RefreshTokenRepository) private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(REFRESH_TOKEN_TTL_DAYS) private readonly refreshTokenTtlDays: number,
  ) {}

  async issue(user: User, options: { familyId?: string } = {}): Promise<IssuedSession> {
    const access = await this.tokens.issueAccessToken({
      sub: user.id,
      email: user.email.value,
    });
    const refresh = this.tokens.generateRefreshToken();
    const now = new Date();

    await this.refreshTokens.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash: refresh.tokenHash,
      familyId: options.familyId ?? randomUUID(),
      expiresAt: new Date(now.getTime() + this.refreshTokenTtlDays * MS_PER_DAY),
      revokedAt: null,
      createdAt: now,
    });

    return {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
      user,
    };
  }
}
