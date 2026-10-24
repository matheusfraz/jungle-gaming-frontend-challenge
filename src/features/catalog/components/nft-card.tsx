import { useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import type { NftSummary } from '@/contracts/nft'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/http/client'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { announce } from '@/components/feedback/announce'
import { useSession } from '@/features/auth/session'
import { useAddToCart } from '@/features/cart/hooks'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'

export function PriceTag({ price, compareAt, className }: { price: string; compareAt?: string | null; className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2 text-sm', className)}>
      <span className="font-bold text-primary">{formatEth(price)}</span>
      {compareAt ? (
        <span className="text-subtle line-through">
          <span className="sr-only">Preço anterior: </span>
          {formatEth(compareAt)}
        </span>
      ) : null}
    </p>
  )
}

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSession()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const [zoomOpen, setZoomOpen] = useState(false)
  const favorite = favorites.isFavorite(nft.id)

  const onFavorite = () => {
    if (!user) {
      void navigate({ to: '/entrar', search: { redirect: location.href } })
      return
    }
    toggleFavorite.mutate({ nftId: nft.id, favorite: !favorite, name: nft.name })
  }

  const onAddToCart = () => {
    addToCart.mutate(
      { nftId: nft.id, editionId: '1-50', quantity: 1 },
      {
        onSuccess: () => {
          toast.success(`${nft.name} (edição 1/50) adicionado ao carrinho.`)
          announce(`${nft.name} adicionado ao carrinho.`)
        },
        onError: (error) => {
          toast.error(errorMessage(error))
          announce(errorMessage(error), 'assertive')
        },
      },
    )
  }

  const actionButton =
    'inline-flex size-8 items-center justify-center rounded-sm border border-border bg-background/90 text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50'

  return (
    <article className="group relative flex flex-col gap-3" data-testid="nft-card">
      <div className="relative bg-card px-1 pt-4 pb-6">
        {nft.rare ? (
          <span className="absolute top-3 left-0 z-10 bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            RARO
          </span>
        ) : null}
        {nft.soldOut ? (
          <span className="absolute top-3 right-0 z-10 bg-foreground px-3 py-1 text-xs font-bold text-background">
            ESGOTADO
          </span>
        ) : null}
        <img
          src={nft.image}
          alt={nft.imageAlt}
          width={480}
          height={480}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="aspect-square w-full rounded-xl object-cover"
        />
        <div
          className={cn(
            'absolute right-2 bottom-2 z-10 flex gap-1.5 transition-opacity',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        >
          <button
            type="button"
            className={actionButton}
            onClick={onAddToCart}
            disabled={nft.soldOut || addToCart.isPending}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
          >
            <ShoppingCart className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(actionButton, favorite && 'border-primary text-primary')}
            onClick={onFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          >
            <Heart className={cn('size-4', favorite && 'fill-current')} aria-hidden />
          </button>
          <button
            type="button"
            className={actionButton}
            onClick={() => setZoomOpen(true)}
            aria-label={`Ampliar imagem de ${nft.name}`}
          >
            <Search className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-normal">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="rounded-xs after:absolute after:inset-0 after:content-[''] focus-visible:outline-2"
          >
            {nft.name}
          </Link>
        </h3>
        <PriceTag price={nft.priceEth} compareAt={nft.compareAtEth} />
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[min(92vw,640px)] p-4 sm:max-w-[640px]">
          <DialogTitle>{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">{nft.imageAlt}</DialogDescription>
          <img src={nft.image} alt={nft.imageAlt} width={480} height={480} className="aspect-square w-full rounded-xl object-cover" />
        </DialogContent>
      </Dialog>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden data-testid="nft-card-skeleton">
      <div className="bg-card px-1 pt-4 pb-6">
        <div className="skeleton aspect-square w-full rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-1/3" />
      </div>
    </div>
  )
}
