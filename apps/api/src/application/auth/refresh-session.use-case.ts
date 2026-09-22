import { Inject, Injectable, Logger } from '@nestjs/common';

import { UnauthorizedError } from '../../domain/errors/domain-errors.js';
import { RefreshTokenRepositoryPort as RefreshTokenRepository } from '../../domain/ports/refresh-token.repository.js';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.js';
import { TokenServicePort as TokenService } from '../../domain/ports/token-service.port.js';
import type { TokenServicePort } from '../../domain/ports/token-service.port.js';
import { UserRepositoryPort as UserRepository } from '../../domain/ports/user.repository.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import type { IssuedSession } from './session-issuer.service.js';
import { SessionIssuer } from './session-issuer.service.js';

@Injectable()
export class RefreshSessionUseCase {
  private readonly logger = new Logger(RefreshSessionUseCase.name);

  constructor(
    @Inject(TokenService) private readonly tokens: TokenServicePort,
    @Inject(RefreshTokenRepository) private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(UserRepository) private readonly users: UserRepositoryPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(refreshToken: string): Promise<IssuedSession> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (!stored) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (stored.revokedAt) {
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}; revoking family`);
      await this.refreshTokens.revokeFamily(stored.familyId, new Date());
      throw new UnauthorizedError('Refresh token reuse detected; session revoked');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedError('Account no longer exists');
    }

    await this.refreshTokens.revokeByHash(tokenHash, new Date());

    return this.sessions.issue(user, { familyId: stored.familyId });
  }
}
