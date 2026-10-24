import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Heart, Mail, Search, Star } from 'lucide-react'
import { toast } from 'sonner'
import { editionLabels, networkLabels, type EditionId, type NftDetail } from '@/contracts/nft'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { errorMessage, isApiError } from '@/lib/http/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { LinkedinIcon, TwitterIcon } from '@/components/common/icons'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { EmptyState, ErrorState } from '@/components/common/states'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { announce } from '@/components/feedback/announce'
import { useSession } from '@/features/auth/session'
import { useAddToCart, useCart } from '@/features/cart/hooks'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { nftDetailQueryOptions } from '@/features/catalog/api'
import { MoreFromCollection, NftCarousel } from './more-from-collection'

const EDITION_PREFERENCE: EditionId[] = ['1-50', '1-10', 'open', '1-1']

function defaultEdition(nft: NftDetail): EditionId {
  return (
    EDITION_PREFERENCE.find((id) => (nft.editions.find((edition) => edition.id === id)?.available ?? 0) > 0) ?? '1-50'
  )
}

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <p className="flex items-center gap-1 text-sm">
      <span className="flex text-foreground" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} className={cn('size-3.5', index < Math.round(rating) ? 'fill-current' : 'opacity-40')} />
        ))}
      </span>
      <span className="sr-only">Nota {rating.toString().replace('.', ',')} de 5.</span>
      <span>{count} avaliações de colecionadores</span>
    </p>
  )
}

function Gallery({ nft }: { nft: NftDetail }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const image = nft.gallery[active] ?? nft.gallery[0]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[100px_minmax(0,1fr)] lg:gap-6">
      <ul className="order-2 flex gap-3 sm:order-1 sm:flex-col" aria-label="Imagens do NFT">
        {nft.gallery.map((item, index) => (
          <li key={item.src} className="w-1/4 sm:w-auto">
            <button
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver imagem ${index + 1} de ${nft.gallery.length}`}
              aria-pressed={index === active}
              className={cn(
                'block overflow-hidden rounded-sm border-2 transition-colors',
                index === active ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              <img
                src={item.src}
                alt=""
                width={100}
                height={100}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative order-1 bg-card p-3 sm:order-2 lg:p-5">
        <img
          src={image.src}
          alt={image.alt}
          width={480}
          height={480}
          fetchPriority="high"
          decoding="async"
          className="aspect-square w-full rounded-xl object-cover"
        />
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full bg-background/80 text-foreground hover:text-primary"
          aria-label="Ampliar imagem"
        >
          <Search className="size-5" aria-hidden />
        </button>
      </div>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-[min(94vw,720px)] p-4 sm:max-w-[720px]">
          <DialogTitle>{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">{image.alt}</DialogDescription>
          <img src={image.src} alt={image.alt} width={480} height={480} className="aspect-square w-full rounded-xl object-cover" />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailSkeleton() {
  // Mirrors the final layout (gallery, info, tabs and carousel) so nothing below shifts.
  return (
    <div aria-busy="true" aria-label="Carregando NFT">
      <div className="container-page flex flex-col gap-4 py-6">
        <div className="skeleton h-5 w-56" />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[100px_minmax(0,1fr)] lg:gap-6">
            <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="skeleton aspect-square w-1/4 sm:w-full" />
              ))}
            </div>
            <div className="order-1 bg-card p-3 sm:order-2 lg:p-5">
              <div className="skeleton aspect-square w-full rounded-xl" />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-7 w-full" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-8 w-1/2" />
            <div className="skeleton h-9 w-full" />
            <div className="skeleton h-20 w-2/3" />
            <div className="skeleton h-5 w-1/2" />
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-4">
          <div className="skeleton h-8 w-full max-w-md" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-40 w-2/3" />
        </div>
      </div>
      <NftCarousel title="Mais desta coleção" items={undefined} loading />
    </div>
  )
}

export function NftDetailPage({
  nftId,
  edition: editionParam,
  onEditionChange,
}: {
  nftId: string
  edition?: EditionId
  onEditionChange: (edition: EditionId) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const query = useQuery(nftDetailQueryOptions(nftId))
  const { data: nft } = query
  const { user } = useSession()
  const cart = useCart()
  const addToCart = useAddToCart()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const [quantity, setQuantity] = useState(1)
  const lastPrice = useRef<string | null>(null)

  useDocumentTitle(nft?.name)

  // Announce realtime price changes on this page.
  useEffect(() => {
    if (!nft) return
    if (lastPrice.current && lastPrice.current !== nft.priceEth) {
      announce(`O preço de ${nft.name} foi atualizado para ${formatEth(nft.priceEth)}.`)
      toast.info(`Preço atualizado: ${formatEth(nft.priceEth)}`)
    }
    lastPrice.current = nft.priceEth
  }, [nft])

  if (query.isPending) return <DetailSkeleton />

  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) {
      return (
        <div className="container-page py-16">
          <EmptyState
            title="NFT não encontrado"
            description="Este NFT não existe, foi removido ou o endereço está incorreto."
            action={
              <Link to="/mercado" className={buttonVariants()}>
                Explorar o mercado
              </Link>
            }
          />
        </div>
      )
    }
    return (
      <div className="container-page py-16">
        <ErrorState
          error={query.error}
          title="Não foi possível carregar este NFT."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </div>
    )
  }

  if (!nft) return null

  const editionId = editionParam && nft.editions.some((item) => item.id === editionParam) ? editionParam : defaultEdition(nft)
  const edition = nft.editions.find((item) => item.id === editionId)!
  const inCart =
    cart.data?.items.find((item) => item.nftId === nft.id && item.editionId === editionId)?.quantity ?? 0
  const maxForEdition = Math.min(edition.available, edition.maxPerOrder)
  const maxQuantity = Math.max(0, maxForEdition - inCart)
  const effectiveQuantity = Math.min(Math.max(1, quantity), Math.max(1, maxQuantity))
  const favorite = favorites.isFavorite(nft.id)
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/nft/${nft.id}` : ''

  const editionMessage =
    edition.available === 0
      ? `A edição ${edition.label} está esgotada. Escolha outra edição.`
      : maxQuantity === 0
        ? `Você já tem o máximo permitido desta edição (${maxForEdition}) no carrinho.`
        : `${edition.available} disponível(is) · máximo de ${edition.maxPerOrder} por pedido${inCart ? ` · ${inCart} no carrinho` : ''}`

  const onBuy = () => {
    addToCart.mutate(
      { nftId: nft.id, editionId, quantity: effectiveQuantity },
      {
        onSuccess: () => {
          announce(`${nft.name} adicionado ao carrinho.`)
          void navigate({ to: '/carrinho' })
        },
        onError: (error) => {
          toast.error(errorMessage(error))
          announce(errorMessage(error), 'assertive')
        },
      },
    )
  }

  const onFavorite = () => {
    if (!user) {
      void navigate({ to: '/entrar', search: { redirect: location.href } })
      return
    }
    toggleFavorite.mutate({ nftId: nft.id, favorite: !favorite, name: nft.name })
  }

  return (
    <>
      <div className="container-page flex flex-col gap-4 py-6">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/mercado' }, { label: nft.name }]} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
          <Gallery nft={nft} />

          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold tracking-wider sm:text-[28px]">{nft.name}</h1>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <p className="flex items-baseline gap-3 text-xl font-bold text-primary sm:text-[22px]" data-testid="nft-price">
                {formatEth(nft.priceEth)}
                {nft.compareAtEth ? (
                  <span className="text-sm font-normal text-subtle line-through">
                    <span className="sr-only">Preço anterior: </span>
                    {formatEth(nft.compareAtEth)}
                  </span>
                ) : null}
              </p>
              <Stars rating={nft.rating} count={nft.reviewsCount} />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-bold">Sobre este NFT:</h2>
              <p className="text-[13px] leading-6 text-muted-foreground">{nft.description}</p>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-bold">Edição:</legend>
              <div className="flex flex-wrap gap-2">
                {nft.editions.map((item) => {
                  const selected = item.id === editionId
                  const soldOut = item.available === 0
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      aria-disabled={soldOut}
                      aria-label={`Edição ${item.label}${soldOut ? ' (esgotada)' : ''}`}
                      onClick={() => {
                        if (soldOut) return
                        setQuantity(1)
                        onEditionChange(item.id)
                      }}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs tracking-wide transition-colors',
                        selected ? 'border-2 border-primary text-foreground' : 'border-border text-muted-foreground',
                        soldOut ? 'cursor-not-allowed line-through opacity-50' : 'hover:border-primary',
                      )}
                    >
                      {editionLabels[item.id]}
                    </button>
                  )
                })}
              </div>
              <p className={cn('text-xs', edition.available === 0 || maxQuantity === 0 ? 'text-destructive' : 'text-subtle')} aria-live="polite">
                {editionMessage}
              </p>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <QuantityStepper
                label="Quantidade"
                value={effectiveQuantity}
                max={Math.max(1, maxQuantity)}
                onChange={setQuantity}
                disabled={maxQuantity === 0}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={onBuy}
                  disabled={maxQuantity === 0 || addToCart.isPending}
                  className="h-9 min-w-[116px] font-bold tracking-wider"
                >
                  {addToCart.isPending ? 'ADICIONANDO…' : 'COMPRAR'}
                </Button>
                <Button variant="outline" onClick={onFavorite} aria-pressed={favorite} className="h-9 text-foreground">
                  <Heart className={cn('text-primary', favorite && 'fill-current')} aria-hidden />
                  {favorite ? 'Favoritado' : 'Favoritar'}
                </Button>
              </div>
            </div>

            <dl className="flex flex-col gap-2 text-[13px] text-muted-foreground">
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

            <div className="flex items-center gap-3 text-sm font-bold">
              <span>Compartilhar este NFT:</span>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                <LinkedinIcon />
                <span className="sr-only">Compartilhar no LinkedIn (abre em nova aba)</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`}
                className="hover:text-primary"
              >
                <Mail className="size-4" aria-hidden />
                <span className="sr-only">Compartilhar por e-mail</span>
              </a>
              <a
                href={`https://x.com/intent/post?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                <TwitterIcon />
                <span className="sr-only">Compartilhar no X (abre em nova aba)</span>
              </a>
            </div>
          </div>
        </div>

        <Tabs defaultValue="details" className="mt-10 gap-0">
          <TabsList className="scrollbar-none h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 sm:gap-8">
            <TabsTrigger
              value="details"
              className="flex-none rounded-none border-0 border-b-2 border-transparent px-0 pb-2 text-sm sm:text-base data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              Detalhes do NFT
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="flex-none rounded-none border-0 border-b-2 border-transparent px-0 pb-2 text-sm sm:text-base data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              Avaliações de colecionadores ({nft.reviewsCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex flex-col gap-5 pt-4 text-[13px] leading-6 text-muted-foreground">
            {nft.longDescription.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="font-bold text-foreground">Rede:</dt>
                <dd>Cunhado na {networkLabels[nft.network]} com procedência imutável e metadados armazenados no IPFS.</dd>
              </div>
              <div>
                <dt className="font-bold text-foreground">Contrato:</dt>
                <dd>Direitos autorais do criador: {nft.royaltyPct}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
              </div>
              <div>
                <dt className="font-bold text-foreground">Direitos autorais:</dt>
                <dd>
                  {nft.contract} · Contrato inteligente {nft.standard} verificado.
                </dd>
              </div>
            </dl>
          </TabsContent>
          <TabsContent value="reviews" className="pt-4">
            <ul className="flex flex-col divide-y divide-border">
              {nft.reviews.map((review) => (
                <li key={review.id} className="flex flex-col gap-1 py-3 text-sm">
                  <p className="flex items-center gap-2">
                    <strong>{review.author}</strong>
                    <span aria-label={`Nota ${review.rating} de 5`} className="text-primary">
                      {'★'.repeat(review.rating)}
                    </span>
                  </p>
                  <p className="text-muted-foreground">{review.comment}</p>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </div>
      <MoreFromCollection nft={nft} />
    </>
  )
}
