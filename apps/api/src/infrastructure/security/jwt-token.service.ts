import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { accessTokenPayloadSchema } from '@deckup/shared';
import type { AccessTokenPayload } from '@deckup/shared';

import { TokenServicePort } from '../../domain/ports/token-service.port.js';
import type {
  GeneratedRefreshToken,
  IssuedAccessToken,
} from '../../domain/ports/token-service.port.js';

const REFRESH_TOKEN_BYTES = 48;
const DEFAULT_ACCESS_TTL_SECONDS = 900;

export const JWT_ISSUER = 'deckup-api';
export const JWT_AUDIENCE = 'deckup-web';

@Injectable()
export class JwtTokenService extends TokenServicePort {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async issueAccessToken(payload: AccessTokenPayload): Promise<IssuedAccessToken> {
    const token = await this.jwtService.signAsync(payload);
    const decoded = this.jwtService.decode<Record<string, unknown>>(token);

    const expiresIn =
      typeof decoded?.exp === 'number' && typeof decoded.iat === 'number'
        ? decoded.exp - decoded.iat
        : DEFAULT_ACCESS_TTL_SECONDS;

    return { token, expiresIn };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return accessTokenPayloadSchema.parse(payload);
  }

  generateRefreshToken(): GeneratedRefreshToken {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    return { token, tokenHash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
