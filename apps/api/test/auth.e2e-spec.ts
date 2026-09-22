import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  API_PREFIX,
  DEFAULT_ACCOUNT,
  extractRefreshCookie,
  registerAccount,
} from './utils/auth.js';
import { createTestApp, resetDatabase } from './utils/test-app.js';

interface AuthBody {
  accessToken: string;
  expiresIn: number;
  user: { id: string; email: string; displayName: string };
}

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  const server = () => app.getHttpServer();

  it('registers a student and sets the refresh cookie', async () => {
    const response = await request(server())
      .post(`${API_PREFIX}/auth/register`)
      .send(DEFAULT_ACCOUNT)
      .expect(201);

    const body = response.body as AuthBody;

    expect(body.user.email).toBe(DEFAULT_ACCOUNT.email);
    expect(body.expiresIn).toBeGreaterThan(0);

    const cookie = extractRefreshCookie(response.headers);
    expect(cookie.startsWith('deckup_refresh=')).toBe(true);
  });

  it('rejects duplicate emails with 409', async () => {
    await registerAccount(app);

    const response = await request(server())
      .post(`${API_PREFIX}/auth/register`)
      .send(DEFAULT_ACCOUNT)
      .expect(409);

    expect(response.body).toMatchObject({ status: 409 });
  });

  it('rejects invalid registration payloads with 422 and field errors', async () => {
    const response = await request(server())
      .post(`${API_PREFIX}/auth/register`)
      .send({ email: 'not-an-email', password: 'short', displayName: '' })
      .expect(422);

    const body = response.body as { status: number; errors: { path: string }[] };

    expect(body.status).toBe(422);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('signs in with valid credentials and rejects a wrong password', async () => {
    await registerAccount(app);

    const login = await request(server())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: DEFAULT_ACCOUNT.email, password: DEFAULT_ACCOUNT.password })
      .expect(200);

    expect((login.body as AuthBody).accessToken).toBeTypeOf('string');

    await request(server())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: DEFAULT_ACCOUNT.email, password: 'wrong-password-1' })
      .expect(401);
  });

  it('protects private routes', async () => {
    await request(server()).get(`${API_PREFIX}/users/me`).expect(401);
  });

  it('returns and updates the authenticated profile', async () => {
    const token = await registerAccount(app);

    const me = await request(server())
      .get(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body).toMatchObject({ email: DEFAULT_ACCOUNT.email, displayName: 'Ana' });

    const updated = await request(server())
      .patch(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Ana Maria', timezone: 'America/Bogota' })
      .expect(200);

    expect(updated.body).toMatchObject({
      displayName: 'Ana Maria',
      timezone: 'America/Bogota',
    });
  });

  it('rejects an invalid timezone', async () => {
    const token = await registerAccount(app);

    await request(server())
      .patch(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ timezone: 'Mars/Olympus' })
      .expect(422);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const registered = await request(server())
      .post(`${API_PREFIX}/auth/register`)
      .send(DEFAULT_ACCOUNT)
      .expect(201);
    const originalCookie = extractRefreshCookie(registered.headers);

    const refreshed = await request(server())
      .post(`${API_PREFIX}/auth/refresh`)
      .set('Cookie', originalCookie)
      .set('X-Requested-With', 'DeckUpWeb')
      .expect(200);
    const rotatedCookie = extractRefreshCookie(refreshed.headers);

    expect(rotatedCookie).not.toBe(originalCookie);

    await request(server())
      .post(`${API_PREFIX}/auth/refresh`)
      .set('Cookie', originalCookie)
      .set('X-Requested-With', 'DeckUpWeb')
      .expect(401);

    await request(server())
      .post(`${API_PREFIX}/auth/refresh`)
      .set('Cookie', rotatedCookie)
      .set('X-Requested-With', 'DeckUpWeb')
      .expect(401);
  });

  it('requires the CSRF header on cookie-based endpoints', async () => {
    const registered = await request(server())
      .post(`${API_PREFIX}/auth/register`)
      .send(DEFAULT_ACCOUNT)
      .expect(201);
    const cookie = extractRefreshCookie(registered.headers);

    await request(server()).post(`${API_PREFIX}/auth/refresh`).set('Cookie', cookie).expect(401);
  });

  it('logs out and invalidates the session', async () => {
    const registered = await request(server())
      .post(`${API_PREFIX}/auth/register`)
      .send(DEFAULT_ACCOUNT)
      .expect(201);
    const cookie = extractRefreshCookie(registered.headers);

    await request(server())
      .post(`${API_PREFIX}/auth/logout`)
      .set('Cookie', cookie)
      .set('X-Requested-With', 'DeckUpWeb')
      .expect(204);

    await request(server())
      .post(`${API_PREFIX}/auth/refresh`)
      .set('Cookie', cookie)
      .set('X-Requested-With', 'DeckUpWeb')
      .expect(401);
  });
});
