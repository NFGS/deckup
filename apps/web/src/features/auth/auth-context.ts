import { createContext, useContext } from 'react';
import type { LoginInput, RegisterInput, UpdateUser, User } from '@deckup/shared';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** True when the session ended on its own (expired or revoked). */
  sessionExpired: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Persists a profile patch and refreshes the in-memory user. */
  updateProfile: (input: UpdateUser) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
