export interface StoredRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export abstract class RefreshTokenRepositoryPort {
  abstract create(token: StoredRefreshToken): Promise<void>;
  abstract findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  abstract revokeByHash(tokenHash: string, revokedAt: Date): Promise<void>;
  abstract revokeFamily(familyId: string, revokedAt: Date): Promise<void>;
}
