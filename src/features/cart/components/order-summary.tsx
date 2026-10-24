import type { ReactNode } from 'react'
import type { Quote } from '@/contracts/commerce'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Subtotal / discount / fee / total exactly as returned by the quote API. */
export function SummaryRows({
  quote,
  loading,
  updating,
  className,
  totalLabel = 'Total',
}: {
  quote: Quote | undefined
  loading: boolean
  updating?: boolean
  className?: string
  totalLabel?: ReactNode
}) {
  const value = (amount: string | undefined, width: string, prefix = '') =>
    loading || !amount ? (
      <span className={cn('skeleton inline-block h-5', width)} aria-hidden />
    ) : (
      <span className="tabular-nums">
        {prefix}
        {formatEth(amount)}
      </span>
    )

  return (
    <div className={cn('flex flex-col gap-3', className)} aria-busy={loading || updating} data-testid="order-summary">
      <dl className="flex flex-col gap-3 text-[15px]">
        <div className="flex items-center justify-between gap-4">
          <dt>Subtotal</dt>
          <dd data-testid="summary-subtotal">{value(quote?.subtotalEth, 'w-24')}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>
            Desconto do lançamento
            {quote?.coupon ? <span className="block text-xs text-subtle">{quote.coupon.code} · {quote.coupon.percent}%</span> : null}
          </dt>
          <dd data-testid="summary-discount">{value(quote?.discountEth, 'w-20', '(-) ')}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <dt>Taxa de rede</dt>
            <dd data-testid="summary-fee">{value(quote?.networkFeeEth, 'w-20')}</dd>
          </div>
          <p className="text-right text-xs text-primary">Taxa estimada</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-lg font-bold">
          <dt>{totalLabel}</dt>
          <dd className="text-primary" data-testid="summary-total">
            {value(quote?.totalEth, 'w-28')}
          </dd>
        </div>
      </dl>
      {updating && !loading ? (
        <p role="status" className="text-right text-xs text-subtle">
          Atualizando valores…
        </p>
      ) : null}
    </div>
  )
}
