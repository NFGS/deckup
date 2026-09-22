import { describe, expect, it } from 'vitest';

import { localDateKey, shiftDateKey } from './local-date.js';

describe('localDateKey', () => {
  const instant = new Date('2026-09-22T03:00:00.000Z');

  it('formats the local calendar day of a timezone', () => {
    expect(localDateKey(instant, 'America/Bogota')).toBe('2026-09-21');
    expect(localDateKey(instant, 'UTC')).toBe('2026-09-22');
    expect(localDateKey(instant, 'Asia/Tokyo')).toBe('2026-09-22');
  });

  it('falls back to UTC when the timezone is not recognized', () => {
    expect(localDateKey(instant, 'Mars/Olympus')).toBe('2026-09-22');
  });
});

describe('shiftDateKey', () => {
  it('shifts forward across month boundaries', () => {
    expect(shiftDateKey('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('shifts backwards across month and year boundaries', () => {
    expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('returns the same day for a zero offset', () => {
    expect(shiftDateKey('2026-09-22', 0)).toBe('2026-09-22');
  });
});
