import type { FastifyReply } from 'fastify';

export const REFRESH_COOKIE_NAME = 'deckup_refresh';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
export const CSRF_HEADER_NAME = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'DeckUpWeb';

const SECONDS_PER_DAY = 24 * 60 * 60;

export interface RefreshCookieOptions {
  secure: boolean;
  ttlDays: number;
}

export function setRefreshCookie(
  reply: FastifyReply,
  token: string,
  options: RefreshCookieOptions,
): void {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    path: REFRESH_COOKIE_PATH,
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    maxAge: options.ttlDays * SECONDS_PER_DAY,
  });
}

export function clearRefreshCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}
