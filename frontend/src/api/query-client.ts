import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';

/**
 * Default React Query client for the application.
 *
 * Retry policy:
 * - Network errors are retried up to 2 times.
 * - 4xx responses are not retried; they will not succeed on retry.
 * - 5xx responses are retried up to 2 times.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
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
}
