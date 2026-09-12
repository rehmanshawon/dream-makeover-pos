import { createContext, useContext, type JSX, type ReactNode } from 'react';
import type { AuthenticatedUser } from '../../types/auth';

export type { AuthenticatedUser, UserRole } from '../../types/auth';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  user: AuthenticatedUser | null;
}

/**
 * Provides authentication state to the application tree.
 *
 * Until Sprint 11 wires real login, callers pass a placeholder user so
 * that layout and navigation can be exercised during development.
 */
export function AuthProvider({ children, user }: AuthProviderProps): JSX.Element {
  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'ADMIN',
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
