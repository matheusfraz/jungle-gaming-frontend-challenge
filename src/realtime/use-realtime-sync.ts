import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart, NftUpdatedEvent, Order } from '@/contracts/commerce'
import { editionLabels, type NftDetail, type NftListResponse } from '@/contracts/nft'
import { formatEth } from '@/lib/money'
import { queryKeys } from '@/lib/query/keys'
import { getToken } from '@/lib/session/token'
import { announce } from '@/components/feedback/announce'
import { cartNotices } from '@/features/cart/notices'
import { useSession } from '@/features/auth/session'
import { realtime } from './client'

function cartChangeMessages(cart: Cart, event: NftUpdatedEvent): string[] {
  const messages: string[] = []
  const lines = cart.items.filter((item) => item.nftId === event.resource.id)
  if (!lines.length) return messages
  const name = lines[0].name
  if (lines[0].unitPriceEth !== event.data.priceEth) {
    messages.push(
      `O preço de ${name} mudou de ${formatEth(lines[0].unitPriceEth)} para ${formatEth(event.data.priceEth)}.`,
    )
  }
  for (const line of lines) {
    const available = event.data.editions.find((edition) => edition.id === line.editionId)?.available ?? 0
    if (available === 0) messages.push(`A edição ${editionLabels[line.editionId]} de ${name} esgotou.`)
    else if (available < line.quantity)
      messages.push(`A edição ${editionLabels[line.editionId]} de ${name} agora tem só ${available} disponível(is).`)
  }
  return messages
}

/**
 * Applies Socket.IO events to the TanStack Query cache. Mounted once in the
 * root layout; every listener is removed when it unmounts.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  useEffect(() => {
    void realtime.connect()
  }, [])

  // Keep the socket's session identity in sync with the REST session.
  useEffect(() => {
    realtime.setSession(user ? getToken() : null, user?.id ?? null)
  }, [user])

  useEffect(() => {
    const offNft = realtime.on('nft.updated', (event) => {
      const { id } = event.resource
      const { data, version } = event

      queryClient.setQueryData<NftDetail>(queryKeys.nft(id), (old) =>
        old && version > old.version
          ? {
              ...old,
              version,
              priceEth: data.priceEth,
              compareAtEth: data.compareAtEth,
              soldOut: data.soldOut,
              editions: old.editions.map((edition) => ({
                ...edition,
                available: data.editions.find((entry) => entry.id === edition.id)?.available ?? edition.available,
              })),
            }
          : old,
      )

      queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.all }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((item) =>
                item.id === id && version > item.version
                  ? { ...item, version, priceEth: data.priceEth, compareAtEth: data.compareAtEth, soldOut: data.soldOut }
                  : item,
              ),
            }
          : old,
      )

      for (const [key, cart] of queryClient.getQueriesData<Cart>({ queryKey: queryKeys.cartRoot })) {
        if (!cart?.items.some((item) => item.nftId === id)) continue
        const messages = cartChangeMessages(cart, event)
        messages.forEach((message, index) => cartNotices.push({ id: `${event.id}:${index}`, nftId: id, message }))
        if (messages.length) {
          toast.info(messages.join(' '))
          announce(`${messages.join(' ')} O resumo do carrinho foi atualizado.`)
        }
        void queryClient.invalidateQueries({ queryKey: key })
        void queryClient.invalidateQueries({ queryKey: queryKeys.quoteRoot })
      }
    })

    const offOrder = realtime.on('order.updated', (event) => {
      const { status, txHash, explorerUrl, rejectionReason } = event.data
      queryClient.setQueriesData<Order>(
        { predicate: (query) => query.queryKey[0] === 'user' && query.queryKey[2] === 'order' && query.queryKey[3] === event.resource.id },
        (old) =>
          old && event.version > old.version
            ? { ...old, status, txHash, explorerUrl, rejectionReason, version: event.version, updatedAt: event.occurredAt }
            : old,
      )
      if (status === 'confirmed') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot })
        announce('Pagamento confirmado. Seus NFTs agora estão na sua carteira.')
      } else if (status === 'rejected') {
        announce('O pagamento foi recusado. Seus itens continuam no carrinho.', 'assertive')
      }
    })

    // After a reconnect, REST is the source of truth: refetch everything active.
    const offReconnect = realtime.onReconnect(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.nftRoot })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cartRoot })
      void queryClient.invalidateQueries({ queryKey: queryKeys.quoteRoot })
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'user' && query.queryKey[2] === 'order',
      })
      announce('Conexão em tempo real restabelecida. Dados atualizados.')
    })

    return () => {
      offNft()
      offOrder()
      offReconnect()
    }
  }, [queryClient])
}
