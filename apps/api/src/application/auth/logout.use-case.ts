import { Inject, Injectable } from '@nestjs/common';

import { RefreshTokenRepositoryPort as RefreshTokenRepository } from '../../domain/ports/refresh-token.repository.js';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.js';
import { TokenServicePort as TokenService } from '../../domain/ports/token-service.port.js';
import type { TokenServicePort } from '../../domain/ports/token-service.port.js';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TokenService) private readonly tokens: TokenServicePort,
    @Inject(RefreshTokenRepository) private readonly refreshTokens: RefreshTokenRepositoryPort,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (stored && !stored.revokedAt) {
      await this.refreshTokens.revokeFamily(stored.familyId, new Date());
    }
  }
}
