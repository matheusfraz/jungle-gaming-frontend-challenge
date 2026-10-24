import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/components/common/coming-soon'

export const Route = createFileRoute('/ajuda')({
  component: () => (
    <ComingSoonPage
      title="Central de ajuda"
      description="Artigos de ajuda, políticas do mercado e denúncias ainda não estão disponíveis. Fale com contato@email.com."
    />
  ),
})
