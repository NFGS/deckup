import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-errors.js';
import { Email } from '../value-objects/email.vo.js';
import { User } from './user.entity.js';

const EMAIL = Email.create('ana@example.com');

function createUser(overrides: Partial<Parameters<typeof User.create>[0]> = {}): User {
  return User.create({
    email: EMAIL,
    passwordHash: 'argon2-hash',
    displayName: 'Ana',
    ...overrides,
  });
}

describe('User', () => {
  it('creates a student with UTC as the default timezone', () => {
    const user = createUser();

    expect(user.displayName).toBe('Ana');
    expect(user.timezone).toBe('UTC');
    expect(user.email.value).toBe('ana@example.com');
    expect(user.createdAt.toISOString()).toBe(user.updatedAt.toISOString());
  });

  it('accepts an explicit timezone and trims the display name', () => {
    const user = createUser({ displayName: '  Ana María  ', timezone: ' America/Bogota ' });

    expect(user.displayName).toBe('Ana María');
    expect(user.timezone).toBe('America/Bogota');
  });

  it('rejects an empty or oversized display name', () => {
    expect(() => createUser({ displayName: '   ' })).toThrow(ValidationError);
    expect(() => createUser({ displayName: 'a'.repeat(81) })).toThrow(ValidationError);
  });

  it('rejects an empty timezone', () => {
    expect(() => createUser({ timezone: '  ' })).toThrow(ValidationError);
  });

  it('rejects a missing password hash', () => {
    expect(() => createUser({ passwordHash: '' })).toThrow(ValidationError);
  });

  it('updates the profile and keeps the previous values for omitted fields', () => {
    const user = createUser();
    const updated = user.withProfile(
      { displayName: 'Ana Updated' },
      new Date('2026-09-23T10:00:00Z'),
    );

    expect(updated).not.toBe(user);
    expect(updated.displayName).toBe('Ana Updated');
    expect(updated.timezone).toBe('UTC');
    expect(updated.updatedAt.toISOString()).toBe('2026-09-23T10:00:00.000Z');
  });

  it('validates profile updates', () => {
    const user = createUser();

    expect(() => user.withProfile({ displayName: ' ' })).toThrow(ValidationError);
    expect(() => user.withProfile({ timezone: ' ' })).toThrow(ValidationError);
  });
});
