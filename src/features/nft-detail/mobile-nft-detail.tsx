import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Heart, ShoppingCart, Star } from 'lucide-react'
import { networkLabels, type EditionId, type NftDetail } from '@/contracts/nft'
import { formatEth, multiplyMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { MobileTopBar } from '@/components/layout/mobile-chrome'
import { EditionPicker } from './edition-picker'
import { MoreFromCollection } from './more-from-collection'
import { artSrcSet } from '@/lib/images'

/** Swipeable gallery with page dots (thumbnails do not fit the mobile frame). */
function MobileGallery({ nft }: { nft: NftDetail }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const onScroll = () => setActive(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)))
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (index: number) => {
    setActive(index)
    scroller.current?.scrollTo({ left: index * scroller.current.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="px-6">
      <div className="relative aspect-square overflow-hidden rounded-2xl">
      <div
        ref={scroller}
        className="scrollbar-none absolute inset-0 flex snap-x snap-mandatory overflow-x-auto"
        tabIndex={0}
        aria-label={`Imagens de ${nft.name} (deslize para ver mais)`}
      >
        {nft.gallery.map((image, index) => (
          <img
            key={image.src}
            src={image.src} srcSet={artSrcSet(image.src)}
            alt={image.alt}
            width={480}
            height={480}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-7 flex justify-center" role="group" aria-label="Imagens do NFT">
        <div className="flex rounded-full bg-background/60 px-1">
          {nft.gallery.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ver imagem ${index + 1} de ${nft.gallery.length}`}
              aria-pressed={index === active}
              className="group inline-flex size-6 items-center justify-center"
            >
              <span
                aria-hidden
                className={cn('size-1.5 rounded-full transition-all', index === active ? 'w-4 bg-primary' : 'bg-foreground/60')}
              />
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 text-primary transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pt-3 text-[13px] leading-6 text-muted-foreground">{children}</div>
    </details>
  )
}

/** Mobile "Detalhes do NFT" frame. */
export function MobileNftDetail({
  nft,
  editionId,
  onSelectEdition,
  editionMessage,
  editionWarning,
  quantity,
  maxQuantity,
  onQuantityChange,
  favorite,
  onFavorite,
  onBuy,
  onAddOnly,
  adding,
}: {
  nft: NftDetail
  editionId: EditionId
  onSelectEdition: (edition: EditionId) => void
  editionMessage: string
  editionWarning: boolean
  quantity: number
  maxQuantity: number
  onQuantityChange: (quantity: number) => void
  favorite: boolean
  onFavorite: () => void
  onBuy: () => void
  onAddOnly: () => void
  adding: boolean
}) {
  const disabled = maxQuantity === 0 || adding

  return (
    // Backdrop and buttons follow the mobile frame; the sheet and the rest of
    // the page use the card color, so no darker strip shows below the sheet.
    <div className="min-h-dvh bg-card pb-48">
      <div className="bg-backdrop pb-4">
        <MobileTopBar
          fallback="/mercado"
          buttonClassName="border border-white/5 bg-backdrop-control"
          right={
            <button
              type="button"
              onClick={onFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? 'Favoritado' : 'Favoritar'}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/5 bg-backdrop-control text-primary hover:bg-secondary"
            >
              <Heart className={cn('size-5', favorite && 'fill-current')} aria-hidden />
            </button>
          }
        />
        <MobileGallery nft={nft} />
      </div>

      <section className="relative -mt-8 rounded-t-3xl bg-card px-5 pt-6 pb-6" aria-labelledby="nft-title">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 id="nft-title" className="text-lg font-bold tracking-wide">
              {nft.name}
            </h1>
            {nft.compareAtEth ? (
              <p className="text-xs text-subtle line-through">
                <span className="sr-only">Preço anterior: </span>
                {formatEth(nft.compareAtEth)}
              </p>
            ) : null}
          </div>
          <p className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-xs">
            <Star className="size-3 fill-primary text-primary" aria-hidden />
            <span className="sr-only">Nota </span>
            {nft.rating.toFixed(1)}
            <span className="text-subtle">
              ({nft.reviewsCount}
              <span className="sr-only"> avaliações</span>)
            </span>
          </p>
        </div>
        <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{nft.description}</p>

        <div className="mt-4">
          <EditionPicker
            editions={nft.editions}
            selected={editionId}
            onSelect={onSelectEdition}
            message={editionMessage}
            warning={editionWarning}
          />
        </div>

        <dl className="mt-4 flex flex-col gap-2 text-[13px] text-muted-foreground">
          <div className="flex gap-1">
            <dt>ID do token:</dt>
            <dd>{nft.tokenId}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Coleção:</dt>
            <dd>{nft.collection}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Atributos:</dt>
            <dd>{nft.attributes.join(', ')}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <Disclosure title="Detalhes do NFT">
            <div className="flex flex-col gap-3">
              {nft.longDescription.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
              <p>
                <strong className="text-foreground">Rede:</strong> {networkLabels[nft.network]} · {nft.contract} ·{' '}
                {nft.standard}
              </p>
            </div>
          </Disclosure>
          <Disclosure title={`Avaliações de colecionadores (${nft.reviewsCount})`}>
            <ul className="flex flex-col gap-3">
              {nft.reviews.map((review) => (
                <li key={review.id}>
                  <p className="text-foreground">
                    <strong>{review.author}</strong>{' '}
                    <span className="text-primary" aria-label={`Nota ${review.rating} de 5`}>
                      {'★'.repeat(review.rating)}
                    </span>
                  </p>
                  <p>{review.comment}</p>
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>
      </section>

      <MoreFromCollection nft={nft} />

      {/* Fixed purchase bar from the frame. */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl bg-card px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.4)]"
        data-testid="mobile-buy-bar"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">Qtd.</span>
            <QuantityStepper
              label="Quantidade"
              value={quantity}
              max={Math.max(1, maxQuantity)}
              onChange={onQuantityChange}
              disabled={maxQuantity === 0}
              size="sm"
            />
          </div>
          <p className="text-xl font-bold text-primary tabular-nums" data-testid="nft-price">
            {formatEth(multiplyMoney(nft.priceEth, quantity))}
          </p>
        </div>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={onBuy}
            disabled={disabled}
            className="h-12 flex-1 rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {adding ? 'Adicionando…' : 'Comprar NFT'}
          </button>
          <button
            type="button"
            onClick={onAddOnly}
            disabled={disabled}
            className="inline-flex size-12 items-center justify-center rounded-full bg-secondary text-primary disabled:opacity-50"
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
