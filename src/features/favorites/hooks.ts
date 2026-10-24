import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { favoritesSchema, type Favorites } from '@/contracts/commerce'
import { errorMessage, request } from '@/lib/http/client'
import { queryKeys } from '@/lib/query/keys'
import { useSession } from '@/features/auth/session'
import { announce } from '@/components/feedback/announce'

const fetchFavorites = (signal?: AbortSignal) => request(favoritesSchema, { url: '/favorites', signal })

const setFavorite = (nftId: string, favorite: boolean) =>
  request(favoritesSchema, {
    method: favorite ? 'PUT' : 'DELETE',
    url: `/favorites/${encodeURIComponent(nftId)}`,
  })

export function useFavorites() {
  const { user } = useSession()
  const query = useQuery({
    queryKey: queryKeys.favorites(user?.id ?? 'anonymous'),
    queryFn: ({ signal }) => fetchFavorites(signal),
    enabled: Boolean(user),
    staleTime: 60_000,
  })
  const ids = new Set(query.data?.nftIds ?? [])
  return { ...query, isFavorite: (nftId: string) => ids.has(nftId) }
}

/**
 * Optimistic toggle: the heart flips immediately; if the API fails the cache
 * is rolled back to the snapshot and the user is told why.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = queryKeys.favorites(user?.id ?? 'anonymous')

  return useMutation({
    mutationKey: ['favorite-toggle'],
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      setFavorite(nftId, favorite),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      const current = previous?.nftIds ?? []
      queryClient.setQueryData<Favorites>(key, {
        nftIds: favorite ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId),
      })
      return { previous }
    },
    onError: (error, { name, favorite }, context) => {
      queryClient.setQueryData(key, context?.previous)
      const message = `Não foi possível ${favorite ? 'favoritar' : 'remover dos favoritos'} ${name}. ${errorMessage(error)}`
      toast.error(message)
      announce(message, 'assertive')
    },
    onSuccess: (data, { name, favorite }) => {
      queryClient.setQueryData(key, data)
      announce(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
