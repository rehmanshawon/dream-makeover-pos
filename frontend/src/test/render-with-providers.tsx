import type { ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../app/auth/AuthContext';
import { authStore } from '../app/auth/auth-store';
import { resetTokenProvider } from '../api/token-provider';
import type { AuthenticatedUser } from '../types/auth';

interface RenderOptions {
  route?: string;
  user?: AuthenticatedUser | null;
  token?: string | null;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/**
 * Renders a tree inside all application providers for testing.
 *
 * Resets the auth store and token provider on every call so that tests
 * do not leak state into each other.
 */
export function renderWithProviders(ui: ReactNode, options: RenderOptions = {}): RenderResult {
  const { route = '/', user = null, token } = options;

  resetTokenProvider();
  authStore.clear();
  if (user) {
    authStore.setSession(user, token ?? 'test-token');
  }

  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
