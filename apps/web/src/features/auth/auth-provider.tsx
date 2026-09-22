import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoginInput, RegisterInput, User } from '@deckup/shared';

import { setUnauthorizedHandler } from '../../lib/api-client';
import { registerAccount, restoreSession, signIn, signOut } from './api';
import { AuthContext } from './auth-context';
import type { AuthContextValue, AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

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
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const handleSignIn = useCallback(async (input: LoginInput) => {
    const session = await signIn(input);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const handleRegister = useCallback(async (input: RegisterInput) => {
    const session = await registerAccount(input);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signIn: handleSignIn,
      register: handleRegister,
      signOut: handleSignOut,
    }),
    [status, user, handleSignIn, handleRegister, handleSignOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
