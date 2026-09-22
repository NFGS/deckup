import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { API_PREFIX, DEFAULT_ACCOUNT } from './utils/auth.js';
import { createTestApp } from './utils/test-app.js';

describe('Throttling (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp({ throttling: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks brute-force attempts on the auth endpoints with 429', async () => {
    const attempts = Array.from({ length: 12 }, () =>
      request(app.getHttpServer()).post(`${API_PREFIX}/auth/login`).send({
        email: DEFAULT_ACCOUNT.email,
        password: 'wrong-password-1',
      }),
    );

    const responses = await Promise.all(attempts);
    const statuses = responses.map((response) => response.status);

    expect(statuses).toContain(429);
  });
});
