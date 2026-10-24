import { createFileRoute } from '@tanstack/react-router'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { nftListQueryOptions } from '@/features/catalog/api'
import { catalogSearchSchema, toListQuery } from '@/features/catalog/search'
import { useSetCatalogSearch } from '@/features/catalog/use-catalog-search'

function MarketPage() {
  const search = Route.useSearch()
  const setSearch = useSetCatalogSearch('/mercado')
  useDocumentTitle('Mercado')
  return (
    <>
      <div className="container-page pt-8">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado' }]} />
        <h1 className="mt-4 text-2xl font-bold tracking-wider">Mercado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Busque, filtre e ordene todo o catálogo da Kurio. Os filtros ficam salvos no endereço da página.
        </p>
      </div>
      <CatalogSection search={search} setSearch={setSearch} title="Resultados do mercado" />
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
