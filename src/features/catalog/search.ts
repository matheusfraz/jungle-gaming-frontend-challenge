import { z } from 'zod'
import { categoryIdSchema, networkIdSchema, sortIdSchema, tabIdSchema, type NftListQuery } from '@/contracts/nft'

/**
 * Catalog URL state. Every key is optional and invalid values are dropped
 * (`.catch`) so a hand-edited or stale URL never breaks the page.
 */
export const catalogSearchSchema = z.object({
  q: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim().slice(0, 60) || undefined)
    .optional()
    .catch(undefined),
  categories: z.array(categoryIdSchema).min(1).optional().catch(undefined),
  networks: z.array(networkIdSchema).min(1).optional().catch(undefined),
  min: z.number().nonnegative().optional().catch(undefined),
  max: z.number().nonnegative().optional().catch(undefined),
  sort: sortIdSchema.optional().catch(undefined),
  tab: tabIdSchema.optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 9

export function toListQuery(search: CatalogSearch): NftListQuery {
  return {
    q: search.q,
    categories: search.categories,
    networks: search.networks,
    minPrice: search.min,
    maxPrice: search.max,
    sort: search.sort ?? 'recent',
    tab: search.tab ?? 'all',
    page: search.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export function activeFilterCount(search: CatalogSearch) {
  return (
    (search.categories?.length ?? 0) +
    (search.networks?.length ?? 0) +
    (search.min !== undefined || search.max !== undefined ? 1 : 0) +
    (search.q ? 1 : 0)
  )
}
