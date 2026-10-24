import { createFileRoute } from '@tanstack/react-router'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { HomeView } from '@/features/catalog/components/home-view'
import { nftListQueryOptions } from '@/features/catalog/api'
import { catalogSearchSchema, toListQuery } from '@/features/catalog/search'
import { useSetCatalogSearch } from '@/features/catalog/use-catalog-search'

function HomePage() {
  useDocumentTitle('Marketplace de NFTs')
  const search = Route.useSearch()
  const setSearch = useSetCatalogSearch('/')
  return <HomeView search={search} onSearch={setSearch} />
}

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  // Start the catalog request in parallel with the route code.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQueryOptions(toListQuery(deps)))
  },
  component: HomePage,
})
