import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type JSX,
  type ReactNode,
} from 'react';
import type { AuthenticatedUser, LoginResponse } from '../../types/auth';
import { api } from '../../api/api-client';
import { authStore } from './auth-store';

export type { AuthenticatedUser, UserRole } from '../../types/auth';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const state = useSyncExternalStore(
    (listener) => authStore.subscribe(listener),
    () => authStore.getState(),
    () => authStore.getState(),
  );

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.post<LoginResponse>(
      '/auth/login',
      { username, password },
      { skipAuth: true },
    );
    authStore.setSession(response.user, response.accessToken);
  }, []);

  const logout = useCallback(() => {
    authStore.clear();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.user !== null && state.token !== null,
      isAdmin: state.user?.role === 'ADMIN',
      login,
      logout,
    }),
    [state.user, state.token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
