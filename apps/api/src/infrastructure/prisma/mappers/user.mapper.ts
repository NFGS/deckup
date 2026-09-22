import { User } from '../../../domain/entities/user.entity.js';
import { Email } from '../../../domain/value-objects/email.vo.js';

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toDomainUser(row: UserRow): User {
  return User.restore({
    id: row.id,
    email: Email.create(row.email),
    passwordHash: row.passwordHash,
    displayName: row.displayName,
    timezone: row.timezone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
