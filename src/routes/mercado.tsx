import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { MobileSearchRow } from '@/features/catalog/components/mobile-home'
import { nftListQueryOptions } from '@/features/catalog/api'
import { activeFilterCount, catalogSearchSchema, toListQuery } from '@/features/catalog/search'
import { useSetCatalogSearch } from '@/features/catalog/use-catalog-search'

function MarketPage() {
  const search = Route.useSearch()
  const setSearch = useSetCatalogSearch('/mercado')
  const isDesktop = useIsDesktop()
  const [filtersOpen, setFiltersOpen] = useState(false)
  useDocumentTitle('Mercado')
  return (
    <>
      {isDesktop ? (
        <div className="container-page pt-8">
          <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado' }]} />
          <h1 className="mt-4 text-2xl font-bold tracking-wider">Mercado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Busque, filtre e ordene todo o catálogo da Kurio. Os filtros ficam salvos no endereço da página.
          </p>
        </div>
      ) : (
        <>
          <h1 className="sr-only">Mercado</h1>
          <MobileSearchRow query={search.q} activeFilters={activeFilterCount(search)} onOpenFilters={() => setFiltersOpen(true)} />
        </>
      )}
      <CatalogSection
        search={search}
        setSearch={setSearch}
        title="Resultados do mercado"
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
      />
    </>
  )
}

export const Route = createFileRoute('/mercado')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQueryOptions(toListQuery(deps)))
  },
  component: MarketPage,
})
