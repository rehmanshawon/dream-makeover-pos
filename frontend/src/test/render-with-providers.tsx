import type { ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, type AuthenticatedUser } from '../app/auth/AuthContext';
import { resetTokenProvider } from '../api/token-provider';

interface RenderOptions {
  route?: string;
  user?: AuthenticatedUser | null;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Renders a React tree wrapped in the application's providers for tests.
 *
 * Provides:
 * - A QueryClientProvider with retries disabled and no cache
 * - An AuthProvider seeded with the given user (default: null)
 * - A MemoryRouter at the specified route (default: '/')
 *
 * Also resets the token provider between renders to avoid leakage
 * across tests.
 */
export function renderWithProviders(ui: ReactNode, options: RenderOptions = {}): RenderResult {
  const { route = '/', user = null } = options;

  resetTokenProvider();

  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider user={user}>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/**
 * Convenience wrapper for components that only need the query provider
 * and router, not auth.
 */
export function renderWithQuery(ui: ReactNode, route = '/'): RenderResult {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
