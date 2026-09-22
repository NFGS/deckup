import { randomUUID } from 'node:crypto';

import { ValidationError } from '../errors/domain-errors.js';
import type { Email } from '../value-objects/email.vo.js';

const DISPLAY_NAME_MAX_LENGTH = 80;
const TIMEZONE_MAX_LENGTH = 64;

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string;
  displayName: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: Email;
  passwordHash: string;
  displayName: string;
  timezone?: string;
  id?: string;
  now?: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: CreateUserInput): User {
    const displayName = input.displayName.trim();
    if (displayName.length === 0 || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      throw new ValidationError('Display name must be between 1 and 80 characters', {
        field: 'displayName',
      });
    }

    const timezone = (input.timezone ?? 'UTC').trim();
    if (timezone.length === 0 || timezone.length > TIMEZONE_MAX_LENGTH) {
      throw new ValidationError('Timezone is not valid', { field: 'timezone' });
    }

    if (input.passwordHash.length === 0) {
      throw new ValidationError('Password hash is required', { field: 'passwordHash' });
    }

    const now = input.now ?? new Date();

    return new User({
      id: input.id ?? randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      displayName,
      timezone,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  withProfile(patch: { displayName?: string; timezone?: string }, now = new Date()): User {
    const displayName = patch.displayName?.trim() ?? this.props.displayName;
    if (displayName.length === 0 || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      throw new ValidationError('Display name must be between 1 and 80 characters', {
        field: 'displayName',
      });
    }

    const timezone = patch.timezone?.trim() ?? this.props.timezone;
    if (timezone.length === 0 || timezone.length > TIMEZONE_MAX_LENGTH) {
      throw new ValidationError('Timezone is not valid', { field: 'timezone' });
    }

    return new User({ ...this.props, displayName, timezone, updatedAt: now });
  }
}
