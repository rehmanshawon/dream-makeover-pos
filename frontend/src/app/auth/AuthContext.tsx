import { createContext, useContext, type JSX, type ReactNode } from 'react';

export type UserRole = 'ADMIN' | 'STAFF';

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  /**
   * The current user. For now this is supplied by the caller as a
   * placeholder. Sprint 11 will replace this with a real login flow.
   */
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
