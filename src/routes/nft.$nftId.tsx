import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { editionIdSchema } from '@/contracts/nft'
import { nftDetailQueryOptions } from '@/features/catalog/api'
import { NftDetailPage } from '@/features/nft-detail/nft-detail-page'

const searchSchema = z.object({
  edicao: editionIdSchema.optional().catch(undefined),
})

function NftRoute() {
  const { nftId } = Route.useParams()
  const { edicao } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <NftDetailPage
      key={nftId}
      nftId={nftId}
      edition={edicao}
      onEditionChange={(edition) => void navigate({ search: { edicao: edition }, replace: true, resetScroll: false })}
    />
  )
}

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: searchSchema,
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQueryOptions(params.nftId))
  },
  component: NftRoute,
})
