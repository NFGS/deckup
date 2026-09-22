import { Inject, Injectable } from '@nestjs/common';
import type { UpdateUser } from '@deckup/shared';

import type { User } from '../../domain/entities/user.entity.js';
import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { UserRepositoryPort as UserRepository } from '../../domain/ports/user.repository.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.js';

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(UserRepository) private readonly users: UserRepositoryPort) {}

  async execute(userId: string, patch: UpdateUser): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const updated = user.withProfile(patch);
    await this.users.update(updated);

    return updated;
  }
}
