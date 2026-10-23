import { QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../http/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError && error.status !== undefined) {
          return error.status >= 500 && failureCount < 2
        }

        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})
