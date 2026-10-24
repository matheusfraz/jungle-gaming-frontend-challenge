import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { AuthResponse, LoginInput, RegisterInput } from '@/contracts/account'
import { queryKeys } from '@/lib/query/keys'
import { getGuestCartId, getToken, rotateGuestCartId, setToken } from '@/lib/session/token'
import { realtime } from '@/realtime/client'
import { fetchSession, login, logout, mergeGuestCart, register } from './api'

export const sessionQueryOptions = queryOptions({
  queryKey: queryKeys.session,
  queryFn: ({ signal }) => fetchSession(signal),
  staleTime: 5 * 60_000,
  retry: (count, error) => count < 2 && !(error as { status?: number })?.status,
})

export function useSession() {
  const query = useQuery(sessionQueryOptions)
  return {
    session: query.data ?? null,
    user: query.data?.user ?? null,
    isPending: query.isPending,
    query,
  }
}

/** Drops every cached query that belongs to a user (private data). */
export async function clearPrivateData(queryClient: QueryClient) {
  const keys = [queryKeys.userRoot, queryKeys.cartRoot, queryKeys.quoteRoot]
  await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })))
  keys.forEach((queryKey) => queryClient.removeQueries({ queryKey }))
}

async function startSession(queryClient: QueryClient, response: AuthResponse) {
  const guestCartId = getGuestCartId()
  // Data cached for a previous user must never leak into the new session.
  await clearPrivateData(queryClient)
  setToken(response.token)
  try {
    // Keep what the visitor added to the cart before signing in.
    const cart = await mergeGuestCart(guestCartId)
    queryClient.setQueryData(queryKeys.cart(`user:${response.session.user.id}`), cart)
  } catch {
    /* the cart is refetched later; a failed merge must not block the login */
  }
  rotateGuestCartId()
  queryClient.setQueryData(queryKeys.session, response.session)
  realtime.setSession(response.token, response.session.user.id)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (response) => startSession(queryClient, response),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (response) => startSession(queryClient, response),
  })
}

export async function endSession(queryClient: QueryClient) {
  setToken(null)
  realtime.setSession(null, null)
  queryClient.setQueryData(queryKeys.session, null)
  await clearPrivateData(queryClient)
}

/** Leaves private pages first, then drops the session and every private cache entry. */
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      if (getToken()) await logout()
    },
    onSettled: async () => {
      await router.navigate({ to: '/' })
      await endSession(queryClient)
    },
  })
}
