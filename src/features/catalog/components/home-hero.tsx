import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { artSrcSet } from '@/lib/images'

/**
 * Editorial highlights for the hero. Images are static assets (preloaded in
 * index.html) so the LCP element does not wait for an API round trip.
 */
const slides = [
  {
    nftId: 'emerald-ape-042',
    image: '/nfts/ape-emerald.webp',
    alt: 'Emerald Ape #042: macaco de óculos redondos verdes e jaqueta college verde.',
  },
  {
    nftId: 'sage-nomad-009',
    image: '/nfts/ape-sage.webp',
    alt: 'Sage Nomad #009: gorila grisalho com chapéu bucket verde e moletom lilás.',
  },
  {
    nftId: 'neon-vessel-552',
    image: '/nfts/ape-ivory.webp',
    alt: 'Neon Vessel #552: chimpanzé de pelo preto com gola alta verde e blazer creme.',
  },
] as const

export function HomeHero() {
  const [active, setActive] = useState(0)
  const slide = slides[active]

  return (
    <section aria-labelledby="hero-title" className="container-page grid items-center gap-8 pt-6 pb-4 md:grid-cols-[minmax(0,1fr)_minmax(0,455px)] md:gap-10 md:pt-4">
      <div className="flex flex-col gap-5 md:pl-12">
        <p className="text-sm font-semibold tracking-widest">Bem-vindo à Kurio</p>
        <h1
          id="hero-title"
          className="text-[28px] leading-[1.6] font-bold tracking-[0.12em] uppercase sm:text-4xl sm:leading-[1.75] lg:text-[40px]"
        >
          Seja dono do futuro da arte digital
        </h1>
        <p className="max-w-[520px] text-xs leading-6 tracking-wide text-muted-foreground sm:text-[13px]">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e
          tenha uma parte da cultura da internet.
        </p>
        <div className="flex items-center justify-between gap-6 pt-2">
          <Link to="/mercado" className={cn(buttonVariants({ size: 'lg' }), 'px-8 text-sm font-bold tracking-wider')}>
            EXPLORAR
          </Link>
          <div className="-mr-2 flex" role="group" aria-label="Destaques">
            {slides.map((item, index) => (
              <button
                key={item.nftId}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Mostrar destaque ${index + 1} de ${slides.length}`}
                aria-pressed={index === active}
                className="group inline-flex size-6 items-center justify-center"
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-2.5 rounded-full transition-colors',
                    index === active ? 'bg-primary' : 'bg-primary/35 group-hover:bg-primary/70',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
      <Link
        to="/nft/$nftId"
        params={{ nftId: slide.nftId }}
        className="block overflow-hidden rounded-[20px] focus-visible:outline-2"
        aria-label={`Ver detalhes: ${slide.alt.split(':')[0]}`}
      >
        <img
          key={slide.image}
          src={slide.image} srcSet={artSrcSet(slide.image)}
          alt={slide.alt}
          width={480}
          height={480}
          fetchPriority={active === 0 ? 'high' : 'auto'}
          decoding="async"
          className="aspect-square w-full object-cover"
        />
      </Link>
    </section>
  )
}
