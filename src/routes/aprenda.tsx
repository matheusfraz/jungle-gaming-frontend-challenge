import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/components/common/coming-soon'

export const Route = createFileRoute('/aprenda')({
  component: () => (
    <ComingSoonPage
      title="Aprenda"
      description="Guias e artigos do Diário da Cunhagem sobre propriedade digital, carteiras e segurança chegam em breve."
    />
  ),
})
