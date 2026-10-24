import { createFileRoute, notFound } from '@tanstack/react-router'
import { Clock } from 'lucide-react'
import { EmptyState } from '@/components/common/states'
import { useDocumentTitle } from '@/components/common/use-document-title'

/** Profile sections outside the challenge scope: clearly marked, never fake success. */
const sections: Record<string, string> = {
  atividade: 'Atividade',
  ofertas: 'Ofertas',
  arquivos: 'Arquivos baixados',
  suporte: 'Suporte',
  colecao: 'Minha coleção',
  estudio: 'Estúdio do criador',
}

function ComingSoonSection() {
  const { section } = Route.useParams()
  const title = sections[section]
  useDocumentTitle(title)
  return (
    <section aria-labelledby="section-title" className="flex flex-col gap-6">
      <h2 id="section-title" className="text-lg font-bold tracking-wide">
        {title}
      </h2>
      <EmptyState
        icon={<Clock className="size-8" />}
        title="Em breve"
        description={`A área “${title}” ainda não está disponível nesta versão do marketplace.`}
      />
    </section>
  )
}

export const Route = createFileRoute('/_authenticated/perfil/$section')({
  beforeLoad: ({ params }) => {
    if (!sections[params.section]) throw notFound()
  },
  component: ComingSoonSection,
})
