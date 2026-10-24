import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { orderSchema, type CreateOrderInput } from '@/contracts/commerce'
import { request } from '@/lib/http/client'
import { queryKeys } from '@/lib/query/keys'
import { realtime } from '@/realtime/client'
import { useSession } from '@/features/auth/session'

/** The client waits at most 6 s for the order to be created before retrying. */
export const ORDER_REQUEST_TIMEOUT_MS = 6000

export async function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  const order = await request(orderSchema, {
    method: 'POST',
    url: '/orders',
    data: input,
    headers: { 'Idempotency-Key': idempotencyKey },
    timeout: ORDER_REQUEST_TIMEOUT_MS,
  })
  realtime.noteVersion(`order:${order.id}`, order.version)
  return order
}

export async function fetchOrder(orderId: string, signal?: AbortSignal) {
  const order = await request(orderSchema, { url: `/orders/${encodeURIComponent(orderId)}`, signal })
  realtime.noteVersion(`order:${order.id}`, order.version)
  return order
}

export function useRealtimeStatus() {
  return useSyncExternalStore(realtime.subscribeStatus, realtime.getStatus, realtime.getStatus)
}

/**
 * Order state comes from REST and is kept fresh by `order.updated` events.
 * While pending and the socket is down, it falls back to polling.
 */
export function useOrder(orderId: string) {
  const { user } = useSession()
  const status = useRealtimeStatus()
  return useQuery({
    queryKey: queryKeys.order(user?.id ?? 'anonymous', orderId),
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    enabled: Boolean(user),
    retry: (count, error) => {
      const code = (error as { status?: number })?.status
      return code !== 404 && code !== 403 && code !== 401 && count < 3
    },
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' && status !== 'connected' ? 3000 : false,
  })
}
