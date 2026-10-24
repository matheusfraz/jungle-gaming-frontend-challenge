import { http, HttpResponse } from 'msw'
import Decimal from 'decimal.js'
import {
  categoryIds,
  categoryLabels,
  networkIds,
  networkLabels,
  sortIdSchema,
  tabIdSchema,
  type NftListResponse,
} from '@/contracts/nft'
import { NEW_RELEASE_CUTOFF, TRENDING_MIN_SALES, type NftRecord } from '../fixtures/nfts'
import { db, getScenario, toNftDetail, toNftSummary } from '../db'
import { API, apiError, withNetwork } from '../http'

function parseNumber(value: string | null): number | undefined {
  if (value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const nftHandlers = [
  http.get(
    `${API}/nfts`,
    withNetwork(({ request }) => {
      const url = new URL(request.url)
      const params = url.searchParams
      const q = params.get('q')?.trim().toLowerCase() ?? ''
      const categories = params.getAll('category').filter((value) => (categoryIds as readonly string[]).includes(value))
      const networks = params.getAll('network').filter((value) => (networkIds as readonly string[]).includes(value))
      const minPrice = parseNumber(params.get('minPrice'))
      const maxPrice = parseNumber(params.get('maxPrice'))
      const sort = sortIdSchema.catch('recent').parse(params.get('sort') ?? 'recent')
      const tab = tabIdSchema.catch('all').parse(params.get('tab') ?? 'all')
      const collection = params.get('collection')
      const exclude = params.get('exclude')
      const featured = params.get('featured') === 'true'
      const pageSize = Math.min(48, Math.max(1, parseNumber(params.get('pageSize')) ?? 9))
      const page = Math.max(1, Math.floor(parseNumber(params.get('page')) ?? 1))

      const all = db.nftOrder.map((id) => db.nfts[id]).filter(Boolean)
      const source = getScenario() === 'empty' ? [] : all

      const matches = (nft: NftRecord, ignore?: 'category' | 'network') => {
        if (q && !`${nft.name} ${nft.collection} ${nft.tokenId}`.toLowerCase().includes(q)) return false
        if (ignore !== 'category' && categories.length && !categories.includes(nft.category)) return false
        if (ignore !== 'network' && networks.length && !networks.includes(nft.network)) return false
        const price = new Decimal(nft.priceEth)
        if (minPrice !== undefined && price.lessThan(minPrice)) return false
        if (maxPrice !== undefined && price.greaterThan(maxPrice)) return false
        if (tab === 'new' && nft.listedAt < NEW_RELEASE_CUTOFF) return false
        if (tab === 'trending' && nft.sales < TRENDING_MIN_SALES) return false
        if (collection && nft.collection !== collection) return false
        if (exclude && nft.id === exclude) return false
        if (featured && !nft.featured) return false
        return true
      }

      const filtered = source.filter((nft) => matches(nft))
      const sorted = [...filtered].sort((left, right) => {
        switch (sort) {
          case 'price-asc':
            return new Decimal(left.priceEth).comparedTo(right.priceEth) || left.name.localeCompare(right.name)
          case 'price-desc':
            return new Decimal(right.priceEth).comparedTo(left.priceEth) || left.name.localeCompare(right.name)
          case 'name-asc':
            return left.name.localeCompare(right.name)
          default:
            return right.listedAt.localeCompare(left.listedAt)
        }
      })

      const total = sorted.length
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(toNftSummary)
      const prices = source.map((nft) => new Decimal(nft.priceEth))

      const body: NftListResponse = {
        items,
        pagination: { page, pageSize, total, totalPages: total === 0 ? 0 : totalPages },
        facets: {
          categories: categoryIds.map((id) => ({
            id,
            label: categoryLabels[id],
            count: source.filter((nft) => nft.category === id && matches(nft, 'category')).length,
          })),
          networks: networkIds.map((id) => ({
            id,
            label: networkLabels[id],
            count: source.filter((nft) => nft.network === id && matches(nft, 'network')).length,
          })),
          priceRange: {
            min: prices.length ? Decimal.min(...prices).toFixed() : '0',
            max: prices.length ? Decimal.max(...prices).toFixed() : '0',
          },
        },
      }
      return HttpResponse.json(body)
    }, 'catalog'),
  ),

  http.get(
    `${API}/nfts/:nftId`,
    withNetwork(({ params }) => {
      const nft = db.nfts[String(params.nftId)]
      if (!nft || getScenario() === 'empty') return apiError(404, 'NOT_FOUND', 'Este NFT não existe ou foi removido.')
      return HttpResponse.json(toNftDetail(nft))
    }, 'catalog'),
  ),
]
