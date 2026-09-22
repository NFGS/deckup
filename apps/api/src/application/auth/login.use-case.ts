import { Inject, Injectable } from '@nestjs/common';
import type { LoginInput } from '@deckup/shared';

import { UnauthorizedError } from '../../domain/errors/domain-errors.js';
import { PasswordHasherPort as PasswordHasher } from '../../domain/ports/password-hasher.port.js';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';
import { UserRepositoryPort as UserRepository } from '../../domain/ports/user.repository.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import type { IssuedSession } from './session-issuer.service.js';
import { SessionIssuer } from './session-issuer.service.js';

const INVALID_CREDENTIALS = 'Invalid email or password';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(UserRepository) private readonly users: UserRepositoryPort,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasherPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(input: LoginInput): Promise<IssuedSession> {
    const email = Email.create(input.email);
    const user = await this.users.findByEmail(email);

    if (!user) {
      await this.hasher.hash(input.password);
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    const passwordMatches = await this.hasher.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    return this.sessions.issue(user);
  }
}
