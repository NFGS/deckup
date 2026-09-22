import { Inject, Injectable } from '@nestjs/common';
import type { RegisterInput } from '@deckup/shared';

import { User } from '../../domain/entities/user.entity.js';
import { ConflictError } from '../../domain/errors/domain-errors.js';
import { PasswordHasherPort as PasswordHasher } from '../../domain/ports/password-hasher.port.js';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port.js';
import { UserRepositoryPort as UserRepository } from '../../domain/ports/user.repository.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import type { IssuedSession } from './session-issuer.service.js';
import { SessionIssuer } from './session-issuer.service.js';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(UserRepository) private readonly users: UserRepositoryPort,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasherPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(input: RegisterInput): Promise<IssuedSession> {
    const email = Email.create(input.email);

    const existing = await this.users.findByEmail(email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await this.hasher.hash(input.password);
    const user = User.create({
      email,
      passwordHash,
      displayName: input.displayName,
      timezone: input.timezone,
    });

    await this.users.create(user);

    return this.sessions.issue(user);
  }
}
