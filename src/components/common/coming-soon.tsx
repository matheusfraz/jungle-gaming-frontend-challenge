import { Link } from '@tanstack/react-router'
import { Clock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useDocumentTitle } from './use-document-title'

/** Editorial pages are outside the challenge scope; say so instead of faking content. */
export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  useDocumentTitle(title)
  return (
    <section className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <Clock className="size-10 text-primary" aria-hidden />
      <h1 className="text-2xl font-bold tracking-wider">{title}</h1>
      <p className="max-w-lg text-sm text-muted-foreground">{description}</p>
      <p className="text-xs text-subtle">Esta seção ainda não está disponível nesta versão.</p>
      <Link to="/mercado" className={buttonVariants()}>
        Explorar o mercado
      </Link>
    </section>
  )
}
