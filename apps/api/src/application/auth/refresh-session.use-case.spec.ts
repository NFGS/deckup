import { beforeEach, describe, expect, it } from 'vitest';

import { User } from '../../domain/entities/user.entity.js';
import { UnauthorizedError } from '../../domain/errors/domain-errors.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { FakeTokenService } from '../../testing/fakes/fake-token-service.fake.js';
import { InMemoryRefreshTokenRepository } from '../../testing/fakes/in-memory-refresh-token.repository.fake.js';
import { InMemoryUserRepository } from '../../testing/fakes/in-memory-user.repository.fake.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';
import { SessionIssuer } from './session-issuer.service.js';
import type { IssuedSession } from './session-issuer.service.js';

const REFRESH_TOKEN_TTL_DAYS = 30;

describe('RefreshSessionUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let tokens: FakeTokenService;
  let sessions: SessionIssuer;
  let useCase: RefreshSessionUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    tokens = new FakeTokenService();
    sessions = new SessionIssuer(tokens, refreshTokens, REFRESH_TOKEN_TTL_DAYS);
    useCase = new RefreshSessionUseCase(tokens, refreshTokens, users, sessions);
  });

  async function seedSession(): Promise<IssuedSession> {
    const user = User.create({
      email: Email.create('ana@example.com'),
      passwordHash: 'hashed:super-secret-1',
      displayName: 'Ana',
    });
    await users.create(user);
    return sessions.issue(user);
  }

  it('rotates the refresh token and keeps the same family', async () => {
    const first = await seedSession();

    const second = await useCase.execute(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);

    const firstStored = refreshTokens.tokens.get(tokens.hashRefreshToken(first.refreshToken));
    const secondStored = refreshTokens.tokens.get(tokens.hashRefreshToken(second.refreshToken));

    expect(firstStored?.revokedAt).not.toBeNull();
    expect(secondStored?.revokedAt).toBeNull();
    expect(secondStored?.familyId).toBe(firstStored?.familyId);
  });

  it('detects reuse of a rotated token and revokes the whole family', async () => {
    const first = await seedSession();
    const second = await useCase.execute(first.refreshToken);

    await expect(useCase.execute(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);

    const secondStored = refreshTokens.tokens.get(tokens.hashRefreshToken(second.refreshToken));
    expect(secondStored?.revokedAt).not.toBeNull();
  });

  it('rejects an unknown token', async () => {
    await expect(useCase.execute('unknown-token')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects an expired token', async () => {
    const first = await seedSession();
    const stored = refreshTokens.tokens.get(tokens.hashRefreshToken(first.refreshToken));

    if (!stored) {
      throw new Error('Expected the refresh token to be stored');
    }

    refreshTokens.tokens.set(stored.tokenHash, {
      ...stored,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(useCase.execute(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
