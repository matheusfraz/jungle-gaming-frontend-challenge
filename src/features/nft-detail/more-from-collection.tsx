import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { NftSummary } from '@/contracts/nft'
import { cn } from '@/lib/utils'
import { nftListQueryOptions } from '@/features/catalog/api'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'

/** Horizontal, scroll-snapping row of related NFTs with page dots. */
export function NftCarousel({
  title,
  items,
  loading,
}: {
  title: string
  items: NftSummary[] | undefined
  loading: boolean
}) {
  const scroller = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const update = () => {
      const count = Math.max(1, Math.round(element.scrollWidth / element.clientWidth))
      setPages(count)
      setPage(Math.min(count - 1, Math.round(element.scrollLeft / element.clientWidth)))
    }
    update()
    element.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      element.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [items])

  const goTo = (index: number) => {
    const element = scroller.current
    if (!element) return
    element.scrollTo({ left: index * element.clientWidth, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="carousel-title" className="container-page py-10">
      <h2 id="carousel-title" className="border-b border-border pb-2 text-base font-bold text-primary">
        {title}
      </h2>
      <ul
        ref={scroller}
        className="scrollbar-none mt-6 grid snap-x snap-mandatory auto-cols-[calc((100%-1rem)/2)] grid-flow-col gap-4 overflow-x-auto md:auto-cols-[calc((100%-4.5rem)/4)] md:gap-6 lg:auto-cols-[calc((100%-6rem)/5)]"
        tabIndex={0}
        aria-label={`${title} (role horizontalmente)`}
      >
        {loading || !items
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="snap-start">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className="snap-start">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
      {pages > 1 ? (
        <div className="mt-4 flex justify-center" role="group" aria-label="Páginas do carrossel">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ir para a página ${index + 1} de ${pages}`}
              aria-pressed={index === page}
              className="group inline-flex size-6 items-center justify-center"
            >
              <span
                aria-hidden
                className={cn(
                  'size-3 rounded-full border border-primary',
                  index === page ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/40',
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function MoreFromCollection({ nft }: { nft: { id: string; collection: string } }) {
  const { data, isPending } = useQuery(
    nftListQueryOptions({ collection: nft.collection, exclude: nft.id, pageSize: 10, sort: 'recent' }),
  )
  return <NftCarousel title="Mais desta coleção" items={data?.items} loading={isPending} />
}
