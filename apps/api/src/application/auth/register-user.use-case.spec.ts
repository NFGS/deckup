import { beforeEach, describe, expect, it } from 'vitest';

import { ConflictError } from '../../domain/errors/domain-errors.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { FakePasswordHasher } from '../../testing/fakes/fake-password-hasher.fake.js';
import { FakeTokenService } from '../../testing/fakes/fake-token-service.fake.js';
import { InMemoryRefreshTokenRepository } from '../../testing/fakes/in-memory-refresh-token.repository.fake.js';
import { InMemoryUserRepository } from '../../testing/fakes/in-memory-user.repository.fake.js';
import { RegisterUserUseCase } from './register-user.use-case.js';
import { SessionIssuer } from './session-issuer.service.js';

const REFRESH_TOKEN_TTL_DAYS = 30;

describe('RegisterUserUseCase', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    const sessions = new SessionIssuer(
      new FakeTokenService(),
      refreshTokens,
      REFRESH_TOKEN_TTL_DAYS,
    );
    useCase = new RegisterUserUseCase(users, new FakePasswordHasher(), sessions);
  });

  it('creates the account and issues a session', async () => {
    const session = await useCase.execute({
      email: 'Student@Example.com',
      password: 'super-secret-1',
      displayName: 'Ana',
    });

    expect(session.user.email.value).toBe('student@example.com');
    expect(session.accessToken).toContain(session.user.id);
    expect(session.refreshToken).toMatch(/^refresh-/);
    expect(refreshTokens.tokens.size).toBe(1);
  });

  it('stores the password hashed, never in plain text', async () => {
    await useCase.execute({
      email: 'ana@example.com',
      password: 'super-secret-1',
      displayName: 'Ana',
    });

    const stored = await users.findByEmail(Email.create('ana@example.com'));

    expect(stored?.passwordHash).toBe('hashed:super-secret-1');
  });

  it('rejects a duplicate email with a conflict', async () => {
    await useCase.execute({
      email: 'ana@example.com',
      password: 'super-secret-1',
      displayName: 'Ana',
    });

    await expect(
      useCase.execute({
        email: 'ANA@example.com',
        password: 'another-secret-1',
        displayName: 'Ana Again',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects an invalid email before touching the repository', async () => {
    await expect(
      useCase.execute({ email: 'not-an-email', password: 'super-secret-1', displayName: 'Ana' }),
    ).rejects.toThrow();

    expect(refreshTokens.tokens.size).toBe(0);
  });
});
