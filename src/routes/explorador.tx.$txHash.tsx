import { createFileRoute } from '@tanstack/react-router'
import { ExplorerPage } from '@/features/orders/components/explorer-page'

function ExplorerRoute() {
  const { txHash } = Route.useParams()
  return <ExplorerPage key={txHash} txHash={txHash} />
}

export const Route = createFileRoute('/explorador/tx/$txHash')({
  component: ExplorerRoute,
})
