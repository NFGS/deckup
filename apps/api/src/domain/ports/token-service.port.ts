import type { AccessTokenPayload } from '@deckup/shared';

export interface IssuedAccessToken {
  token: string;
  expiresIn: number;
}

export interface GeneratedRefreshToken {
  token: string;
  tokenHash: string;
}

export abstract class TokenServicePort {
  abstract issueAccessToken(payload: AccessTokenPayload): Promise<IssuedAccessToken>;
  abstract verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  abstract generateRefreshToken(): GeneratedRefreshToken;
  abstract hashRefreshToken(token: string): string;
}
