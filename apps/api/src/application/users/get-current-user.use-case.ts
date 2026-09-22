import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../domain/errors/domain-errors.js';
import { UserRepositoryPort as UserRepository } from '../../domain/ports/user.repository.js';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import type { User } from '../../domain/entities/user.entity.js';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(UserRepository) private readonly users: UserRepositoryPort) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user;
  }
}
