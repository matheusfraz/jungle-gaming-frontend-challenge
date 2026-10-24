import { z } from 'zod'
import { moneySchema, paginationSchema } from './common'

export const categoryIds = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'memberships',
  'utility',
] as const

export const networkIds = ['ethereum', 'polygon', 'solana'] as const
export const editionIds = ['1-1', '1-10', '1-50', 'open'] as const
export const sortIds = ['recent', 'price-asc', 'price-desc', 'name-asc'] as const
export const tabIds = ['all', 'new', 'trending'] as const

export const categoryIdSchema = z.enum(categoryIds)
export const networkIdSchema = z.enum(networkIds)
export const editionIdSchema = z.enum(editionIds)
export const sortIdSchema = z.enum(sortIds)
export const tabIdSchema = z.enum(tabIds)

export const editionSchema = z.object({
  id: editionIdSchema,
  label: z.string(),
  /** Units still available for sale in this edition. */
  available: z.number().int().nonnegative(),
  /** Max units a single order may contain. */
  maxPerOrder: z.number().int().positive(),
})

export const nftSummarySchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  name: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  priceEth: moneySchema,
  compareAtEth: moneySchema.nullable(),
  category: categoryIdSchema,
  network: networkIdSchema,
  collection: z.string(),
  rare: z.boolean(),
  /** True when no edition has units left. */
  soldOut: z.boolean(),
  version: z.number().int().nonnegative(),
})

export const reviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(),
})

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  longDescription: z.array(z.string()),
  gallery: z.array(z.object({ src: z.string(), alt: z.string() })),
  attributes: z.array(z.string()),
  rating: z.number(),
  reviewsCount: z.number().int(),
  reviews: z.array(reviewSchema),
  creator: z.string(),
  royaltyPct: z.number(),
  contract: z.string(),
  standard: z.string(),
  editions: z.array(editionSchema),
})

export const facetSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
})

export const nftListQuerySchema = z.object({
  q: z.string().optional(),
  categories: z.array(categoryIdSchema).optional(),
  networks: z.array(networkIdSchema).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  sort: sortIdSchema.optional(),
  tab: tabIdSchema.optional(),
  collection: z.string().optional(),
  exclude: z.string().optional(),
  featured: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
})

export const nftListResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  pagination: paginationSchema,
  facets: z.object({
    categories: z.array(facetSchema),
    networks: z.array(facetSchema),
    priceRange: z.object({ min: moneySchema, max: moneySchema }),
  }),
})

export type CategoryId = z.infer<typeof categoryIdSchema>
export type NetworkId = z.infer<typeof networkIdSchema>
export type EditionId = z.infer<typeof editionIdSchema>
export type SortId = z.infer<typeof sortIdSchema>
export type TabId = z.infer<typeof tabIdSchema>
export type Edition = z.infer<typeof editionSchema>
export type NftSummary = z.infer<typeof nftSummarySchema>
export type NftDetail = z.infer<typeof nftDetailSchema>
export type Review = z.infer<typeof reviewSchema>
export type NftListQuery = z.infer<typeof nftListQuerySchema>
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const categoryLabels: Record<CategoryId, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d-art': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  memberships: 'Assinaturas',
  utility: 'Utilidade',
}

export const networkLabels: Record<NetworkId, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const sortLabels: Record<SortId, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  'name-asc': 'Nome (A–Z)',
}

export const tabLabels: Record<TabId, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const editionLabels: Record<EditionId, string> = {
  '1-1': '1/1',
  '1-10': '1/10',
  '1-50': '1/50',
  open: 'ABERTA',
}
