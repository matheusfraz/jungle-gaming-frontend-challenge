import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { artSrcSet } from '@/lib/images'

const promos = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: '/nfts/ape-emerald.webp',
    alt: 'Emerald Ape com óculos verdes',
    search: { tab: 'new' as const },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: '/nfts/ape-ivory.webp',
    alt: 'Ivory Baron de blazer creme',
    search: { categories: ['digital-art' as const] },
  },
]

const posts = [
  { date: '12 de setembro', minutes: 6, title: 'Como funciona a propriedade de NFTs', excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.', image: '/nfts/ape-ivory.webp' },
  { date: '13 de setembro', minutes: 2, title: '10 artistas digitais para acompanhar', excerpt: 'Conheça criadores que moldam a cultura digital.', image: '/nfts/ape-emerald.webp' },
  { date: '15 de setembro', minutes: 3, title: 'Raridade, atributos e procedência', excerpt: 'Entenda raridade, direitos autorais e utilidade.', image: '/nfts/ape-sage.webp' },
  { date: '15 de setembro', minutes: 2, title: 'Como proteger sua carteira', excerpt: 'Proteja sua carteira, seus ativos e sua identidade.', image: '/nfts/ape-golden.webp' },
]

export function HomePromos() {
  return (
    <section aria-label="Coleções em destaque" className="container-page grid gap-6 pb-16 md:grid-cols-2">
      {promos.map((promo) => (
        <article key={promo.title} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center bg-card">
          <img
            src={promo.image} srcSet={artSrcSet(promo.image)}
            alt={promo.alt}
            width={480}
            height={480}
            loading="lazy"
            decoding="async"
            className="aspect-[157/136] h-full w-full rounded-lg object-cover"
          />
          <div className="flex flex-col items-end gap-2 p-3 text-right sm:gap-3 sm:p-4">
            <h3 className="text-xs font-bold sm:text-sm">{promo.title}</h3>
            <p className="hidden text-[11px] leading-5 text-muted-foreground sm:block">{promo.text}</p>
            <Link to="/mercado" search={promo.search} className={cn(buttonVariants({ size: 'sm' }), 'text-xs')}>
              Explorar <ArrowRight aria-hidden />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

export function HomeJournal() {
  return (
    <section aria-labelledby="journal-title" className="container-page pb-16">
      <div className="mb-8 text-center">
        <h2 id="journal-title" className="text-xl font-bold tracking-wider sm:text-2xl">
          Diário da Cunhagem
        </h2>
        <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <li key={post.title}>
            <article className="relative flex h-full flex-col bg-card">
              <img
                src={post.image} srcSet={artSrcSet(post.image)}
                alt=""
                width={480}
                height={480}
                loading="lazy"
                decoding="async"
                className="aspect-[3/2] w-full object-cover object-top"
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-[11px] text-subtle">
                  {post.date} <span aria-hidden>|</span> Leitura de {post.minutes} min
                </p>
                <h3 className="text-sm font-bold">{post.title}</h3>
                <p className="text-xs text-muted-foreground">{post.excerpt}</p>
                <Link
                  to="/aprenda"
                  className="mt-auto pt-2 text-xs text-primary after:absolute after:inset-0 hover:underline"
                >
                  Ler mais <span aria-hidden>→</span>
                  <span className="sr-only">: {post.title}</span>
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
