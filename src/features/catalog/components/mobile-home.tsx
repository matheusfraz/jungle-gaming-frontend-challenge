import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { artSrcSet } from '@/lib/images'

/** "Explorar coleções" search + orange filter button (mobile Início frame). */
export function MobileSearchRow({
  query,
  activeFilters,
  onOpenFilters,
}: {
  query?: string
  activeFilters: number
  onOpenFilters: () => void
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [value, setValue] = useState(query ?? '')

  // Keep the field in sync with the URL (history navigation, cleared chips).
  const [lastQuery, setLastQuery] = useState(query)
  if (lastQuery !== query) {
    setLastQuery(query)
    setValue(query ?? '')
  }

  // On the market page the search applies while typing (debounced).
  useEffect(() => {
    if (pathname !== '/mercado') return
    const next = value.trim() || undefined
    if (next === query) return
    const timer = window.setTimeout(() => {
      void navigate({ to: '/mercado', search: (prev) => ({ ...prev, q: next, page: undefined }), replace: true })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [value, pathname, query, navigate])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void navigate({ to: '/mercado', search: (prev) => ({ ...(pathname === '/mercado' ? prev : {}), q: value.trim() || undefined, page: undefined }) })
  }

  return (
    <div className="flex gap-3 px-4 pt-4">
      <form role="search" onSubmit={submit} className="relative min-w-0 flex-1">
        <label htmlFor="mobile-search" className="sr-only">
          Explorar coleções
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-primary" aria-hidden />
        <input
          id="mobile-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Explorar coleções"
          enterKeyHint="search"
          className="h-12 w-full rounded-xl bg-card pr-3 pl-11 text-sm placeholder:text-muted-foreground"
        />
      </form>
      <button
        type="button"
        onClick={onOpenFilters}
        className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        aria-label={`Filtros${activeFilters ? ` (${activeFilters})` : ''}`}
      >
        <SlidersHorizontal className="size-5" aria-hidden />
        {activeFilters ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background"
          >
            {activeFilters}
          </span>
        ) : null}
      </button>
    </div>
  )
}

const slides = [
  { nftId: 'emerald-ape-042', image: '/nfts/ape-emerald.webp', name: 'Emerald Ape #042' },
  { nftId: 'sage-nomad-009', image: '/nfts/ape-sage.webp', name: 'Sage Nomad #009' },
  { nftId: 'neon-vessel-552', image: '/nfts/ape-ivory.webp', name: 'Neon Vessel #552' },
] as const

/** Hero card from the mobile Início frame. */
export function MobileHero() {
  const [active, setActive] = useState(0)
  const slide = slides[active]
  const companion = slides[(active + 1) % slides.length]

  return (
    <section aria-labelledby="hero-title" className="px-4 pt-4">
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#7a5534_0%,#563820_45%,#2e1c11_100%)] p-4 pb-3">
        <span aria-hidden className="absolute -top-16 left-1/3 size-56 rounded-full bg-white/[0.06]" />
        <span aria-hidden className="absolute -bottom-24 -left-10 size-48 rounded-full bg-white/[0.04]" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_42%] items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] tracking-wide text-foreground/90">Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="text-[15px] leading-7 font-bold tracking-[0.08em] uppercase">
              Seja dono da cultura digital
            </h1>
            <p className="text-[10px] leading-4 text-foreground/70">Descubra NFTs selecionados de criadores do mundo todo.</p>
            <Link
              to="/mercado"
              className="mt-1 inline-flex w-fit items-center gap-2 text-[11px] font-bold tracking-wider text-primary"
            >
              EXPLORAR <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <Link to="/nft/$nftId" params={{ nftId: slide.nftId }} className="relative block" aria-label={`Ver detalhes: ${slide.name}`}>
            <img
              key={slide.image}
              src={slide.image} srcSet={artSrcSet(slide.image)}
              alt={slide.name}
              width={480}
              height={480}
              fetchPriority={active === 0 ? 'high' : 'auto'}
              decoding="async"
              className="aspect-[13/12] w-full rounded-xl object-cover"
            />
            <img
              src={companion.image} srcSet={artSrcSet(companion.image)}
              alt=""
              width={160}
              height={160}
              loading="lazy"
              className="absolute -bottom-2 left-2 aspect-square w-[42%] rounded-lg border-2 border-[#563820] object-cover"
            />
          </Link>
        </div>
        <div className="relative mt-2 flex justify-center" role="group" aria-label="Destaques">
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
                  'size-2 rounded-full transition-colors',
                  index === active ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/70',
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
