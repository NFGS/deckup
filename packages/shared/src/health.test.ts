import { describe, expect, it } from 'vitest';

import { healthResponseSchema } from './health.js';

const validPayload = {
  status: 'ok',
  service: 'deckup-api',
  version: '0.1.0',
  uptimeSeconds: 12.5,
  timestamp: '2026-09-22T08:00:00.000Z',
};

describe('healthResponseSchema', () => {
  it('parses a valid health payload', () => {
    expect(healthResponseSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('rejects a payload with a wrong status', () => {
    expect(() => healthResponseSchema.parse({ ...validPayload, status: 'down' })).toThrow();
  });

  it('rejects a payload with a non-ISO timestamp', () => {
    expect(() => healthResponseSchema.parse({ ...validPayload, timestamp: 'yesterday' })).toThrow();
  });

  it('rejects negative uptime', () => {
    expect(() => healthResponseSchema.parse({ ...validPayload, uptimeSeconds: -1 })).toThrow();
  });
});
