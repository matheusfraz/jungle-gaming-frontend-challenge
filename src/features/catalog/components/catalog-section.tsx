import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import { sortIds, sortLabels, tabIds, tabLabels, categoryLabels, networkLabels, type SortId } from '@/contracts/nft'
import { cn } from '@/lib/utils'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { EmptyState, ErrorState } from '@/components/common/states'
import { announce } from '@/components/feedback/announce'
import { nftListQueryOptions } from '../api'
import { activeFilterCount, CATALOG_PAGE_SIZE, toListQuery, type CatalogSearch } from '../search'
import { CatalogFilters } from './catalog-filters'
import { FeaturedNft } from './featured-nft'
import { NftCard, NftCardSkeleton } from './nft-card'

export type SetCatalogSearch = (patch: Partial<CatalogSearch>, options?: { resetPage?: boolean }) => void

function pageNumbers(current: number, total: number): (number | 'gap')[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('gap')
    result.push(page)
  })
  return result
}

export function CatalogSection({
  search,
  setSearch,
  showFeatured = false,
  title = 'Catálogo de NFTs',
  filtersOpen,
  onFiltersOpenChange,
}: {
  search: CatalogSearch
  setSearch: SetCatalogSearch
  showFeatured?: boolean
  title?: string
  /** Controlled filter drawer (opened by the mobile search row). */
  filtersOpen?: boolean
  onFiltersOpenChange?: (open: boolean) => void
}) {
  const isDesktop = useIsDesktop()
  const [localFiltersOpen, setLocalFiltersOpen] = useState(false)
  const drawerOpen = filtersOpen ?? localFiltersOpen
  const setDrawerOpen = onFiltersOpenChange ?? setLocalFiltersOpen
  const params = toListQuery(search)
  const query = useQuery(nftListQueryOptions(params))
  const { data, isPending, isError, error, isFetching, isPlaceholderData, refetch } = query
  const gridRef = useRef<HTMLDivElement>(null)
  const filters = activeFilterCount(search)
  const total = data?.pagination.total

  // Announce result counts after each completed search/filter change.
  useEffect(() => {
    if (total === undefined || isPlaceholderData) return
    announce(total === 0 ? 'Nenhum NFT encontrado.' : `${total} NFT(s) encontrado(s).`)
  }, [total, isPlaceholderData, search])

  const changeFilters = (patch: Partial<CatalogSearch>) => setSearch(patch, { resetPage: true })
  const clearAll = (includeTab = false) =>
    setSearch(
      {
        q: undefined,
        categories: undefined,
        networks: undefined,
        min: undefined,
        max: undefined,
        ...(includeTab ? { tab: undefined } : {}),
      },
      { resetPage: true },
    )

  const chips = [
    ...(search.q ? [{ key: 'q', label: `“${search.q}”`, remove: () => changeFilters({ q: undefined }) }] : []),
    ...(search.categories ?? []).map((id) => ({
      key: `c-${id}`,
      label: categoryLabels[id],
      remove: () => changeFilters({ categories: search.categories?.filter((item) => item !== id) }),
    })),
    ...(search.networks ?? []).map((id) => ({
      key: `n-${id}`,
      label: networkLabels[id],
      remove: () => changeFilters({ networks: search.networks?.filter((item) => item !== id) }),
    })),
    ...(search.min !== undefined || search.max !== undefined
      ? [
          {
            key: 'price',
            label: `${(search.min ?? 0).toFixed(2)}–${search.max !== undefined ? search.max.toFixed(2) : '∞'} ETH`,
            remove: () => changeFilters({ min: undefined, max: undefined }),
          },
        ]
      : []),
  ]

  const totalPages = data?.pagination.totalPages ?? 0
  const currentPage = search.page ?? 1

  const goToPage = (page: number) => {
    setSearch({ page: page === 1 ? undefined : page })
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filterPanel = (
    <CatalogFilters search={search} facets={data?.facets} onChange={changeFilters} />
  )

  const sortSelect = (
    <>
      <label htmlFor="catalog-sort" className={cn('text-sm whitespace-nowrap', isDesktop ? 'max-sm:sr-only' : 'font-bold')}>
        Ordenar por:
      </label>
      <Select
        value={search.sort ?? 'recent'}
        onValueChange={(value) => changeFilters({ sort: value === 'recent' ? undefined : (value as SortId) })}
      >
        <SelectTrigger
          id="catalog-sort"
          size="sm"
          className={cn(
            'font-normal',
            isDesktop ? 'min-w-0 flex-1 border-0 bg-transparent px-1 sm:min-w-[200px] sm:flex-none' : 'w-full',
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortIds.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {sortLabels[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <section aria-labelledby="catalog-title" className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-5 md:gap-8 md:py-12 lg:grid-cols-[312px_minmax(0,1fr)]">
      <h2 id="catalog-title" className="sr-only">
        {title}
      </h2>

      {/* On mobile the filters live in a drawer and the aside (featured card) moves below the grid. */}
      <aside className="order-last flex flex-col gap-6 max-md:hidden lg:order-none" aria-label="Filtros do catálogo">
        <div className="hidden lg:block">{filterPanel}</div>
        {showFeatured ? <FeaturedNft /> : null}
      </aside>

      <div className="flex min-w-0 flex-col gap-6" ref={gridRef}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <nav aria-label="Tipo de listagem" className="scrollbar-none -mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0">
            <ul className="flex gap-4 whitespace-nowrap md:gap-5">
              {tabIds.map((tab) => {
                const active = (search.tab ?? 'all') === tab
                return (
                  <li key={tab}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => changeFilters({ tab: tab === 'all' ? undefined : tab })}
                      className={cn(
                        'border-b-2 pb-1.5 text-[13px] transition-colors hover:text-primary md:text-sm',
                        active ? 'border-primary font-bold text-primary' : 'border-transparent text-foreground',
                      )}
                    >
                      {tabLabels[tab]}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              {isDesktop ? (
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal aria-hidden />
                    Filtros{filters ? ` (${filters})` : ''}
                  </Button>
                </SheetTrigger>
              ) : null}
              <SheetContent side={isDesktop ? 'left' : 'bottom'} className={cn('overflow-y-auto p-0', isDesktop ? 'w-[88vw] max-w-sm' : 'max-h-[85vh] rounded-t-3xl')}>
                <SheetHeader className="px-5 pt-5">
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Combine coleções, faixa de preço e rede.</SheetDescription>
                </SheetHeader>
                {!isDesktop ? <div className="flex flex-col gap-2 px-5 pt-2">{sortSelect}</div> : null}
                {filterPanel}
              </SheetContent>
            </Sheet>
            {isDesktop ? sortSelect : null}
          </div>
        </div>

        {chips.length ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.remove}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/60 px-3 py-1 text-xs text-primary hover:bg-primary/10"
              >
                {chip.label}
                <X className="size-3" aria-hidden />
                <span className="sr-only">Remover filtro</span>
              </button>
            ))}
            <button type="button" onClick={() => clearAll()} className="text-xs text-subtle underline-offset-4 hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between text-xs text-subtle" aria-hidden={!data}>
          <span>{data ? `${data.pagination.total} resultado(s)` : ' '}</span>
          {isFetching && !isPending ? (
            <span role="status" className="inline-flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
              Atualizando…
            </span>
          ) : null}
        </div>

        {isError && !data ? (
          <ErrorState
            error={error}
            title="Não foi possível carregar o catálogo."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : isPending ? (
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-6 max-md:[&>*:nth-child(even)]:mt-10 md:grid-cols-3 md:gap-x-6 md:gap-y-8"
            aria-busy="true"
            aria-label="Carregando NFTs"
          >
            {Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => (
              <NftCardSkeleton key={index} />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            title="Nenhum NFT encontrado"
            description="Tente outra busca ou remova alguns filtros para ver mais resultados."
            action={
              filters || search.tab ? (
                <Button variant="outline" onClick={() => clearAll(true)}>
                  Limpar filtros
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {isError ? (
              <p role="alert" className="text-sm text-destructive">
                Não foi possível atualizar os resultados. Mostrando os últimos carregados.{' '}
                <button type="button" className="underline" onClick={() => void refetch()}>
                  Tentar novamente
                </button>
              </p>
            ) : null}
            <ul
              className={cn(
                // Mobile frame: the right column is offset down (staggered grid).
                'grid grid-cols-2 gap-x-4 gap-y-6 transition-opacity max-md:[&>li:nth-child(even)]:mt-10 md:grid-cols-3 md:gap-x-6 md:gap-y-8',
                isPlaceholderData && 'opacity-60',
              )}
              aria-busy={isFetching}
              data-testid="nft-grid"
            >
              {data.items.map((nft, index) => (
                <li key={nft.id}>
                  <NftCard nft={nft} priority={index < 3} />
                </li>
              ))}
            </ul>
          </>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Paginação" className="mt-4 flex justify-end">
            <ul className="flex items-center gap-2">
              <li>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-xs border border-border text-sm disabled:opacity-40"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
              </li>
              {pageNumbers(currentPage, totalPages).map((page, index) =>
                page === 'gap' ? (
                  <li key={`gap-${index}`} aria-hidden className="px-1 text-subtle">
                    …
                  </li>
                ) : (
                  <li key={page}>
                    <button
                      type="button"
                      onClick={() => goToPage(page)}
                      aria-current={page === currentPage ? 'page' : undefined}
                      aria-label={`Página ${page}`}
                      className={cn(
                        'inline-flex size-8 items-center justify-center rounded-xs border text-sm tabular-nums',
                        page === currentPage
                          ? 'border-primary bg-primary font-bold text-primary-foreground'
                          : 'border-border hover:border-primary',
                      )}
                    >
                      {page}
                    </button>
                  </li>
                ),
              )}
              <li>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-xs border border-border text-sm disabled:opacity-40"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </li>
            </ul>
          </nav>
        ) : null}

      </div>
    </section>
  )
}
