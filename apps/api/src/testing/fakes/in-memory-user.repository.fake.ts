import { UserRepositoryPort } from '../../domain/ports/user.repository.js';
import type { User } from '../../domain/entities/user.entity.js';
import type { Email } from '../../domain/value-objects/email.vo.js';

export class InMemoryUserRepository extends UserRepositoryPort {
  private readonly users = new Map<string, User>();

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findByEmail(email: Email): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  create(user: User): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  update(user: User): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }
}
