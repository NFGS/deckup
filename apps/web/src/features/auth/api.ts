import { authSessionSchema, loginSchema, registerSchema, userSchema } from '@deckup/shared';
import type { AuthSession, LoginInput, RegisterInput, User } from '@deckup/shared';

import { apiRequest, clearSession, refreshAccessToken, setAccessToken } from '../../lib/api-client';

export async function registerAccount(input: RegisterInput): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: registerSchema.parse(input),
    schema: authSessionSchema,
    skipAuthRefresh: true,
  });

  setAccessToken(session.accessToken);
  return session;
}

export async function signIn(input: LoginInput): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: loginSchema.parse(input),
    schema: authSessionSchema,
    skipAuthRefresh: true,
  });

  setAccessToken(session.accessToken);
  return session;
}

export async function signOut(): Promise<void> {
  await clearSession();
}

export async function fetchCurrentUser(): Promise<User> {
  return apiRequest('/users/me', { schema: userSchema });
}

/**
 * Restores a session from the refresh cookie on application start-up.
 */
export async function restoreSession(): Promise<User | null> {
  const refreshed = await refreshAccessToken();

  if (!refreshed) {
    return null;
  }

  try {
    return await fetchCurrentUser();
  } catch {
    return null;
  }
}
