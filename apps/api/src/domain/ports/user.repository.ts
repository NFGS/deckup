import type { User } from '../entities/user.entity.js';
import type { Email } from '../value-objects/email.vo.js';

export abstract class UserRepositoryPort {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract create(user: User): Promise<void>;
  abstract update(user: User): Promise<void>;
}
