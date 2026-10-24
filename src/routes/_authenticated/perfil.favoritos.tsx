import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/common/states'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { nftDetailQueryOptions } from '@/features/catalog/api'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useFavorites } from '@/features/favorites/hooks'

function FavoritesPage() {
  useDocumentTitle('Lista de interesse')
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const details = useQueries({ queries: ids.map((id) => nftDetailQueryOptions(id)) })

  return (
    <section aria-labelledby="favorites-title" className="flex flex-col gap-6">
      <h2 id="favorites-title" className="text-lg font-bold tracking-wide">
        Lista de interesse
      </h2>
      {favorites.isError ? (
        <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} retrying={favorites.isFetching} />
      ) : favorites.isPending ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <NftCardSkeleton key={index} />
          ))}
        </div>
      ) : ids.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-8" />}
          title="Nenhum favorito ainda"
          description="Toque no coração de um NFT para acompanhá-lo aqui."
          action={
            <Link to="/mercado" className={buttonVariants()}>
              Explorar o mercado
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6" data-testid="favorites-grid">
          {details.map((query, index) => (
            <li key={ids[index]}>{query.data ? <NftCard nft={query.data} /> : <NftCardSkeleton />}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const Route = createFileRoute('/_authenticated/perfil/favoritos')({
  component: FavoritesPage,
})
