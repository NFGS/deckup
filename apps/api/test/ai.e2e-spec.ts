import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { API_PREFIX, registerAccount } from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

describe('AI card suggestions (e2e)', () => {
  let app: NestFastifyApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    token = await registerAccount(app);
  });

  const server = () => app.getHttpServer();
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('answers 503 when no provider is configured', async () => {
    const response = await request(server())
      .post(`${API_PREFIX}/ai/card-suggestions`)
      .set(auth())
      .send({ notes: 'Mitosis is a type of cell division that produces two identical cells.' })
      .expect(503);

    expect(response.body).toMatchObject({ status: 503 });
  });

  it('validates the notes payload', async () => {
    await request(server())
      .post(`${API_PREFIX}/ai/card-suggestions`)
      .set(auth())
      .send({ notes: 'too short' })
      .expect(422);

    await request(server())
      .post(`${API_PREFIX}/ai/card-suggestions`)
      .set(auth())
      .send({ notes: 'A'.repeat(20), maxCards: 99 })
      .expect(422);
  });

  it('requires authentication', async () => {
    await request(server())
      .post(`${API_PREFIX}/ai/card-suggestions`)
      .send({ notes: 'Mitosis is a type of cell division that produces two identical cells.' })
      .expect(401);
  });
});
