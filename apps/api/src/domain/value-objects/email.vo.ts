import { ValidationError } from '../errors/domain-errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/**
 * Email address value object.
 *
 * Normalizes to lower-case and validates format once, at construction time.
 */
export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();

    if (normalized.length === 0 || normalized.length > MAX_EMAIL_LENGTH) {
      throw new ValidationError('Email length is not valid', { field: 'email' });
    }

    if (!EMAIL_PATTERN.test(normalized)) {
      throw new ValidationError('Email format is not valid', { field: 'email' });
    }

    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
