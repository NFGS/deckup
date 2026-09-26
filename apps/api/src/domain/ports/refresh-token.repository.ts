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
  /** Revokes the token only if it is still active; returns whether this call revoked it. */
  abstract revokeByHash(tokenHash: string, revokedAt: Date): Promise<boolean>;
  abstract revokeFamily(familyId: string, revokedAt: Date): Promise<void>;
}
