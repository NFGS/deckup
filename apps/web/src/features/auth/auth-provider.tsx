import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoginInput, RegisterInput, UpdateUser, User } from '@deckup/shared';

import { purgeApiCaches, setUnauthorizedHandler } from '../../lib/api-client';
import { clearAllQueues } from '../../lib/offline-queue';
import { registerAccount, restoreSession, signIn, signOut, updateProfile } from './api';
import { AuthContext } from './auth-context';
import type { AuthContextValue, AuthStatus } from './auth-context';

const SESSION_EPOCH_KEY = 'deckup.session-epoch';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    void restoreSession().then((restored) => {
      if (!active) {
        return;
      }

      setUser(restored);
      setStatus(restored ? 'authenticated' : 'anonymous');
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
      setSessionExpired(true);
      queryClient.clear();
      void purgeApiCaches();
    });

    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_EPOCH_KEY) {
        return;
      }

      setUser(null);
      setStatus('anonymous');
      setSessionExpired(false);
      queryClient.clear();
      void purgeApiCaches();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [queryClient]);

  const handleSignIn = useCallback(async (input: LoginInput) => {
    const session = await signIn(input);
    await purgeApiCaches();
    setSessionExpired(false);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const handleRegister = useCallback(async (input: RegisterInput) => {
    const session = await registerAccount(input);
    await purgeApiCaches();
    setSessionExpired(false);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const handleUpdateProfile = useCallback(async (input: UpdateUser) => {
    const updated = await updateProfile(input);
    setUser(updated);
  }, []);

  const handleSignOut = useCallback(async () => {
    clearAllQueues();
    await signOut();
    setSessionExpired(false);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();

    try {
      localStorage.setItem(SESSION_EPOCH_KEY, String(Date.now()));
    } catch {
      // Storage unavailable: other tabs will notice on their next request.
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      sessionExpired,
      signIn: handleSignIn,
      register: handleRegister,
      signOut: handleSignOut,
      updateProfile: handleUpdateProfile,
    }),
    [
      status,
      user,
      sessionExpired,
      handleSignIn,
      handleRegister,
      handleSignOut,
      handleUpdateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
