import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';

export interface TestAccount {
  email: string;
  password: string;
  displayName: string;
}

export const DEFAULT_ACCOUNT: TestAccount = {
  email: 'ana@example.com',
  password: 'super-secret-1',
  displayName: 'Ana',
};

export const API_PREFIX = '/api/v1';

export async function registerAccount(
  app: NestFastifyApplication,
  account: TestAccount = DEFAULT_ACCOUNT,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post(`${API_PREFIX}/auth/register`)
    .send(account)
    .expect(201);

  const body = response.body as { accessToken: string };
  return body.accessToken;
}

export function extractRefreshCookie(headers: Record<string, unknown>): string {
  const values = toStringArray(headers['set-cookie']);
  const cookie = values.find((value) => value.startsWith('deckup_refresh='));

  if (!cookie) {
    throw new Error('Refresh cookie not found in response headers');
  }

  return cookie.split(';')[0] ?? '';
}

function toStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return (raw as unknown[]).filter((value): value is string => typeof value === 'string');
  }
  return typeof raw === 'string' ? [raw] : [];
}
