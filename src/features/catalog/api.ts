import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { nftDetailSchema, nftListResponseSchema, type NftListQuery } from '@/contracts/nft'
import { request } from '@/lib/http/client'
import { queryKeys } from '@/lib/query/keys'
import { realtime } from '@/realtime/client'

export async function fetchNfts(params: NftListQuery, signal?: AbortSignal) {
  const data = await request(nftListResponseSchema, {
    url: '/nfts',
    signal,
    params: {
      q: params.q || undefined,
      category: params.categories,
      network: params.networks,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sort: params.sort,
      tab: params.tab,
      collection: params.collection,
      exclude: params.exclude,
      featured: params.featured || undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    paramsSerializer: { indexes: null },
  })
  data.items.forEach((item) => realtime.noteVersion(`nft:${item.id}`, item.version))
  return data
}

export async function fetchNft(id: string, signal?: AbortSignal) {
  const data = await request(nftDetailSchema, { url: `/nfts/${encodeURIComponent(id)}`, signal })
  realtime.noteVersion(`nft:${data.id}`, data.version)
  return data
}

/**
 * The key contains every parameter sent to the API, so each combination has
 * its own cache entry. `signal` cancels superseded requests, and TanStack
 * Query ignores responses for keys that are no longer observed — a slow,
 * older response can never overwrite the current results.
 */
export const nftListQueryOptions = (params: NftListQuery) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => fetchNfts(params, signal),
    placeholderData: keepPreviousData,
  })

export const nftDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nft(id),
    queryFn: ({ signal }) => fetchNft(id, signal),
    retry: (count, error) => (error as { status?: number })?.status !== 404 && count < 2,
  })
