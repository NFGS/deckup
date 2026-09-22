import type { AccessTokenPayload } from '@deckup/shared';

import { TokenServicePort } from '../../domain/ports/token-service.port.js';
import type {
  GeneratedRefreshToken,
  IssuedAccessToken,
} from '../../domain/ports/token-service.port.js';

export class FakeTokenService extends TokenServicePort {
  private counter = 0;

  issueAccessToken(payload: AccessTokenPayload): Promise<IssuedAccessToken> {
    this.counter += 1;
    return Promise.resolve({ token: `access-${this.counter}-${payload.sub}`, expiresIn: 900 });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const [, , subject] = token.split('-');
    if (!subject) {
      return Promise.reject(new Error('Invalid access token'));
    }
    return Promise.resolve({ sub: subject, email: `${subject}@example.com` });
  }

  generateRefreshToken(): GeneratedRefreshToken {
    this.counter += 1;
    const token = `refresh-${this.counter}`;
    return { token, tokenHash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return `hash:${token}`;
  }
}
