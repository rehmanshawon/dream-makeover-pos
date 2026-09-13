import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';
import { handleUnauthorized } from './auth-error-handler';
import { authStore } from '../app/auth/auth-store';

/**
 * Default React Query client for the application.
 *
 * Retry policy:
 * - Network errors are retried up to 2 times.
 * - 4xx responses are not retried.
 * - 5xx responses are retried up to 2 times.
 *
 * Error handling:
 * - Any 401 from an authenticated endpoint clears the session.
 * - When the session is cleared, the entire query cache is cleared to
 *   prevent data from a previous user leaking into the next one.
 */
export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleUnauthorized(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        handleUnauthorized(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false;
          if (error instanceof ApiError) {
            if (error.status >= 400 && error.status < 500) return false;
          }
          return true;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });

  // Clear the query cache whenever the session is cleared, either by
  // logout or by the 401 handler.
  let previousToken: string | null = authStore.getState().token;
  authStore.subscribe(() => {
    const currentToken = authStore.getState().token;
    if (previousToken !== null && currentToken === null) {
      client.clear();
    }
    previousToken = currentToken;
  });

  return client;
}
