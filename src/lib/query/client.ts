import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '../http/client'

/**
 * Cache policy (see ARCHITECTURE.md › Cache):
 * - public catalog data: fresh for 30 s, kept 5 min, background refetch on remount;
 * - queries retry only transient failures (network, timeout, 5xx), twice, with backoff;
 * - 4xx answers (validation, auth, not found, conflicts) are never retried;
 * - mutations never retry automatically — order creation retries explicitly with
 *   the same idempotency key, everything else asks the user.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error)) return error.isTransient && failureCount < 2
        return failureCount < 2
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
    },
    mutations: {
      retry: false,
    },
  },
})
