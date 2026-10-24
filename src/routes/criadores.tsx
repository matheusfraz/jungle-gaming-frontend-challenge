import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/components/common/coming-soon'

export const Route = createFileRoute('/criadores')({
  component: () => (
    <ComingSoonPage title="Criadores" description="Perfis de artistas, estúdios e comunidades da Kurio chegam em breve." />
  ),
})
