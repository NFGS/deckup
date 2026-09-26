import { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.js';
import type { StoredRefreshToken } from '../../domain/ports/refresh-token.repository.js';

export class InMemoryRefreshTokenRepository extends RefreshTokenRepositoryPort {
  readonly tokens = new Map<string, StoredRefreshToken>();

  create(token: StoredRefreshToken): Promise<void> {
    this.tokens.set(token.tokenHash, { ...token });
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return Promise.resolve(this.tokens.get(tokenHash) ?? null);
  }

  revokeByHash(tokenHash: string, revokedAt: Date): Promise<boolean> {
    const token = this.tokens.get(tokenHash);

    if (token && !token.revokedAt) {
      this.tokens.set(tokenHash, { ...token, revokedAt });
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  revokeFamily(familyId: string, revokedAt: Date): Promise<void> {
    for (const [hash, token] of this.tokens) {
      if (token.familyId === familyId && !token.revokedAt) {
        this.tokens.set(hash, { ...token, revokedAt });
      }
    }
    return Promise.resolve();
  }
}
