import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cartSchema, quoteSchema, type AddCartItemInput, type Cart, type QuoteRequest } from '@/contracts/commerce'
import type { NetworkId } from '@/contracts/nft'
import { request } from '@/lib/http/client'
import { queryKeys } from '@/lib/query/keys'
import { getGuestCartId } from '@/lib/session/token'
import { useSession } from '@/features/auth/session'

/* ---------- API ---------- */

export const cartApi = {
  get: (signal?: AbortSignal) => request(cartSchema, { url: '/cart', signal }),
  add: (input: AddCartItemInput) => request(cartSchema, { method: 'POST', url: '/cart/items', data: input }),
  update: (lineId: string, quantity: number) =>
    request(cartSchema, { method: 'PATCH', url: `/cart/items/${lineId}`, data: { quantity } }),
  remove: (lineId: string) => request(cartSchema, { method: 'DELETE', url: `/cart/items/${lineId}` }),
  applyCoupon: (code: string) => request(cartSchema, { method: 'POST', url: '/cart/coupon', data: { code } }),
  removeCoupon: () => request(cartSchema, { method: 'DELETE', url: '/cart/coupon' }),
}

export const createQuote = (input: QuoteRequest, signal?: AbortSignal) =>
  request(quoteSchema, { method: 'POST', url: '/quotes', data: input, signal })

/* ---------- Hooks ---------- */

/** Cart owner: the signed-in user, or the visitor's persistent guest cart. */
export function useCartOwner(): { owner: string; ready: boolean } {
  const { user, isPending } = useSession()
  return { owner: user ? `user:${user.id}` : `guest:${getGuestCartId()}`, ready: !isPending }
}

export function useCart() {
  const { owner, ready } = useCartOwner()
  const query = useQuery({
    queryKey: queryKeys.cart(owner),
    queryFn: ({ signal }) => cartApi.get(signal),
    enabled: ready,
    staleTime: 15_000,
  })
  const count = query.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0
  return { ...query, owner, count }
}

function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const { owner } = useCartOwner()
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(owner), cart)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.quoteRoot }),
  })
}

export function useAddToCart() {
  return useCartMutation((input: AddCartItemInput) => cartApi.add(input))
}

export function useRemoveCartLine() {
  return useCartMutation((lineId: string) => cartApi.remove(lineId))
}

export function useApplyCoupon() {
  return useCartMutation((code: string) => cartApi.applyCoupon(code))
}

export function useRemoveCoupon() {
  return useCartMutation<void>(() => cartApi.removeCoupon())
}

/**
 * Quantity changes are optimistic: the stepper moves instantly and is rolled
 * back if the API rejects the change (e.g. availability conflict).
 */
export function useUpdateCartQuantity() {
  const queryClient = useQueryClient()
  const { owner } = useCartOwner()
  const key = queryKeys.cart(owner)
  return useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) => cartApi.update(lineId, quantity),
    onMutate: async ({ lineId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) {
        queryClient.setQueryData<Cart>(key, {
          ...previous,
          items: previous.items.map((item) => (item.id === lineId ? { ...item, quantity } : item)),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (cart) => queryClient.setQueryData(key, cart),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: queryKeys.quoteRoot })
    },
  })
}

/** Signature of what is being quoted; part of the query key. */
export function quoteSignature(cart: Cart, network: NetworkId) {
  return [
    network,
    cart.couponCode ?? '',
    ...cart.items.map((item) => `${item.nftId}:${item.editionId}:${item.quantity}:${item.unitPriceEth}:${item.nftVersion}`),
  ].join('|')
}

/** Server-side quote for the current cart: subtotal, discount, fee and total come from the API. */
export function useCartQuote(cart: Cart | undefined, network: NetworkId = 'ethereum') {
  const { owner } = useCartOwner()
  const signature = cart ? quoteSignature(cart, network) : 'empty'
  return useQuery({
    queryKey: queryKeys.quote(owner, signature),
    queryFn: ({ signal }) =>
      createQuote(
        {
          items: cart!.items.map((item) => ({ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity })),
          couponCode: cart!.couponCode,
          network,
        },
        signal,
      ),
    enabled: Boolean(cart && cart.items.length > 0),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  })
}
