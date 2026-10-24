import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { couponInputSchema, type CartLine } from '@/contracts/commerce'
import { editionLabels } from '@/contracts/nft'
import { formatEth, multiplyMoney } from '@/lib/money'
import { errorMessage, isApiError } from '@/lib/http/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { QuantityStepper } from '@/components/common/quantity-stepper'
import { EmptyState, ErrorState, InlineAlert } from '@/components/common/states'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { announce } from '@/components/feedback/announce'
import { nftListQueryOptions } from '@/features/catalog/api'
import { NftCarousel } from '@/features/nft-detail/more-from-collection'
import {
  useApplyCoupon,
  useCart,
  useCartQuote,
  useRemoveCartLine,
  useRemoveCoupon,
  useUpdateCartQuantity,
} from '../hooks'
import { CartNotices } from './cart-notices'
import { SummaryRows } from './order-summary'

function CartRow({ line }: { line: CartLine }) {
  const update = useUpdateCartQuantity()
  const remove = useRemoveCartLine()
  const overLimit = line.quantity > line.maxQuantity

  const changeQuantity = (quantity: number) =>
    update.mutate(
      { lineId: line.id, quantity },
      {
        onSuccess: () => announce(`Quantidade de ${line.name} alterada para ${quantity}.`),
        onError: (error) => {
          toast.error(errorMessage(error))
          announce(errorMessage(error), 'assertive')
        },
      },
    )

  const onRemove = () =>
    remove.mutate(line.id, {
      onSuccess: () => {
        toast.success(`${line.name} removido do carrinho.`)
        announce(`${line.name} removido do carrinho.`)
      },
      onError: (error) => toast.error(errorMessage(error)),
    })

  return (
    <li
      className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 bg-card pr-4 md:grid-cols-[80px_minmax(0,2.2fr)_1fr_1.2fr_1fr_40px] md:gap-x-4 md:pr-6"
      data-testid="cart-row"
    >
      <img
        src={line.image}
        alt={line.imageAlt}
        width={80}
        height={80}
        loading="lazy"
        className="row-span-2 aspect-square w-full self-stretch object-cover md:row-span-1"
      />
      <div className="min-w-0 py-2">
        <p className="truncate text-base font-bold">
          <Link to="/nft/$nftId" params={{ nftId: line.nftId }} className="hover:text-primary">
            {line.name}
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">ID do token: {line.tokenId}</p>
        <p className="text-xs text-subtle">Edição {editionLabels[line.editionId]}</p>
      </div>
      <p className="hidden text-base md:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(line.unitPriceEth)}
      </p>
      <div className="col-start-2 md:col-start-auto">
        <QuantityStepper
          label={`Quantidade de ${line.name}`}
          value={line.quantity}
          max={Math.max(line.quantity > line.maxQuantity ? line.quantity : line.maxQuantity, 1)}
          onChange={changeQuantity}
          size="sm"
        />
      </div>
      <p className="col-start-3 row-start-1 text-right text-base font-bold text-primary md:col-start-auto md:row-start-auto md:text-left">
        <span className="sr-only">Total do item: </span>
        {formatEth(multiplyMoney(line.unitPriceEth, line.quantity))}
      </p>
      <button
        type="button"
        onClick={onRemove}
        disabled={remove.isPending}
        className="col-start-3 row-start-2 inline-flex size-9 items-center justify-center justify-self-end rounded-sm text-foreground hover:text-destructive md:col-start-auto md:row-start-auto"
        aria-label={`Remover ${line.name} do carrinho`}
      >
        <Trash2 className="size-5" aria-hidden />
      </button>
      {overLimit ? (
        <div className="col-span-3 pb-3 pl-4 md:col-span-6 md:pl-0">
          <InlineAlert
            tone="error"
            action={
              line.maxQuantity > 0 ? (
                <Button size="sm" variant="outline" onClick={() => changeQuantity(line.maxQuantity)}>
                  Ajustar para {line.maxQuantity}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={onRemove}>
                  Remover
                </Button>
              )
            }
          >
            {line.maxQuantity === 0
              ? 'Esta edição esgotou e não pode ser comprada.'
              : `Só restam ${line.maxQuantity} unidade(s) disponíveis para esta edição.`}
          </InlineAlert>
        </div>
      ) : null}
    </li>
  )
}

function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsed = couponInputSchema.safeParse({ code })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message)
      return
    }
    setError(undefined)
    apply.mutate(parsed.data.code, {
      onSuccess: () => {
        setCode('')
        announce(`Cupom ${parsed.data.code.toUpperCase()} aplicado.`)
        toast.success('Cupom aplicado.')
      },
      onError: (err) => {
        const message = isApiError(err) ? err.fieldErrors.code ?? err.message : errorMessage(err)
        setError(message)
        announce(message, 'assertive')
      },
    })
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm border border-primary/60 bg-secondary px-3 py-2 text-sm">
        <span>
          Cupom <strong className="text-primary">{appliedCode}</strong> aplicado
        </span>
        <button
          type="button"
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => announce('Cupom removido.'),
              onError: (err) => toast.error(errorMessage(err)),
            })
          }
          disabled={remove.isPending}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <X className="size-3.5" aria-hidden /> Remover
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor="coupon-code" className="text-sm font-bold">
        Código promocional
      </label>
      <div className="flex">
        <input
          id="coupon-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-error' : 'coupon-hint'}
          className="h-11 min-w-0 flex-1 rounded-l-sm border border-primary bg-background px-3 text-xs uppercase placeholder:normal-case placeholder:text-subtle"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className="h-11 rounded-r-sm bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error ? (
        <p id="coupon-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id="coupon-hint" className="text-xs text-subtle">
          Experimente KURIO10 ou GENESIS25.
        </p>
      )}
    </form>
  )
}

function CartSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando carrinho">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="grid h-20 grid-cols-[80px_1fr] gap-4 bg-card">
          <div className="skeleton h-20 w-20 rounded-none" />
          <div className="flex flex-col justify-center gap-2">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-3 w-1/4" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function CartPage() {
  useDocumentTitle('Carrinho')
  const navigate = useNavigate()
  const cart = useCart()
  const quote = useCartQuote(cart.data)
  const suggestions = useQuery(nftListQueryOptions({ tab: 'trending', pageSize: 10, sort: 'recent' }))
  const items = cart.data?.items ?? []
  const blockingIssues = (quote.data?.issues ?? []).filter(
    (issue) => issue.type === 'UNAVAILABLE' || issue.type === 'INSUFFICIENT_QUANTITY',
  )
  const couponIssue = quote.data?.issues.find((issue) => issue.type === 'COUPON_EXPIRED' || issue.type === 'COUPON_INVALID')
  const canCheckout = items.length > 0 && quote.isSuccess && !quote.isFetching && blockingIssues.length === 0

  return (
    <>
      <div className="container-page flex flex-col gap-4 py-6">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/mercado' }, { label: 'Carrinho' }]} />
        <h1 className="sr-only">Carrinho de NFTs</h1>

        {cart.isError && !cart.data ? (
          <ErrorState error={cart.error} title="Não foi possível carregar o carrinho." onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
        ) : !cart.isPending && items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="size-8" />}
            title="Seu carrinho está vazio"
            description="Explore o mercado e adicione NFTs para vê-los aqui."
            action={
              <Link to="/mercado" className={buttonVariants()}>
                Explorar o mercado
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-24">
            <section aria-labelledby="cart-items-title" className="flex min-w-0 flex-col gap-3">
              <h2 id="cart-items-title" className="sr-only">
                Itens
              </h2>
              <div
                aria-hidden
                className="hidden grid-cols-[80px_minmax(0,2.2fr)_1fr_1.2fr_1fr_40px] gap-x-4 border-b border-border pb-2 text-base font-bold md:grid"
              >
                <span className="col-span-2">NFTs</span>
                <span>Preço</span>
                <span>Edições</span>
                <span>Total</span>
              </div>
              <CartNotices />
              {cart.isPending ? (
                <CartSkeleton />
              ) : (
                <ul className="flex flex-col gap-3" aria-label="Itens no carrinho">
                  {items.map((line) => (
                    <CartRow key={line.id} line={line} />
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="summary-title" className="flex flex-col gap-6 self-start">
              <h2 id="summary-title" className="border-b border-border pb-3 text-lg font-bold tracking-wide">
                Resumo da carteira
              </h2>
              <CouponForm appliedCode={cart.data?.couponCode ?? null} />
              {couponIssue ? <InlineAlert tone="error">{couponIssue.message}</InlineAlert> : null}
              {quote.isError ? (
                <ErrorState
                  error={quote.error}
                  title="Não foi possível calcular o total."
                  onRetry={() => void quote.refetch()}
                  retrying={quote.isFetching}
                  className="py-6"
                />
              ) : (
                <SummaryRows
                  quote={quote.data}
                  loading={cart.isPending || (quote.isPending && items.length > 0)}
                  updating={quote.isFetching}
                />
              )}
              {blockingIssues.length ? (
                <InlineAlert tone="error">
                  {blockingIssues.map((issue) => issue.message).join(' ')} Ajuste o carrinho para continuar.
                </InlineAlert>
              ) : null}
              <Button
                size="lg"
                className="h-11 w-full text-base"
                disabled={!canCheckout}
                onClick={() => void navigate({ to: '/pagamento' })}
              >
                Conectar e finalizar
              </Button>
              <Link to="/mercado" className="text-center text-base text-primary hover:underline">
                Continuar explorando
              </Link>
            </section>
          </div>
        )}
      </div>
      <NftCarousel title="Colecionadores também viram" items={suggestions.data?.items} loading={suggestions.isPending} />
    </>
  )
}
