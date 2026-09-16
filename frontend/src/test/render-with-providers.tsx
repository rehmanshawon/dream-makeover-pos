import type { ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../app/auth/AuthContext';
import { authStore } from '../app/auth/auth-store';
import { resetTokenProvider } from '../api/token-provider';
import { resetReceiptPrinter } from '../app/pages/pos/receipt/printer/printer-provider';
import type { AuthenticatedUser } from '../types/auth';

interface RenderOptions {
  route?: string;
  user?: AuthenticatedUser | null;
  token?: string | null;
}

/**
 * Creates a fresh QueryClient for each test.
 *
 * Retries are disabled so failed queries surface immediately, and the
 * cache is discarded after each test to prevent cross-test pollution.
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Renders a React tree wrapped in all providers the app uses:
 * - QueryClientProvider (React Query)
 * - MemoryRouter (React Router)
 * - AuthProvider (authentication)
 *
 * Also resets the module-level singletons (token provider and printer)
 * so state cannot leak between tests.
 */
export function renderWithProviders(ui: ReactNode, options: RenderOptions = {}): RenderResult {
  const { route = '/', user = null, token = null } = options;

  resetTokenProvider();
  resetReceiptPrinter();

  authStore.clear();
  if (user && token) {
    authStore.setSession(user, token);
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
