import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-errors.js';
import { Email } from './email.vo.js';

describe('Email', () => {
  it('normalizes to lower-case and trims whitespace', () => {
    const email = Email.create('  Student@Example.COM ');

    expect(email.value).toBe('student@example.com');
  });

  it('accepts common valid formats', () => {
    expect(() => Email.create('a@b.co')).not.toThrow();
    expect(() => Email.create('first.last+tag@sub.domain.org')).not.toThrow();
  });

  it('rejects malformed addresses', () => {
    expect(() => Email.create('not-an-email')).toThrow(ValidationError);
    expect(() => Email.create('missing@domain')).toThrow(ValidationError);
    expect(() => Email.create('@domain.com')).toThrow(ValidationError);
    expect(() => Email.create('')).toThrow(ValidationError);
  });

  it('compares by normalized value', () => {
    expect(Email.create('A@B.com').equals(Email.create('a@b.com'))).toBe(true);
    expect(Email.create('a@b.com').equals(Email.create('c@d.com'))).toBe(false);
  });
});
