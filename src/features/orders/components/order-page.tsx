import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, XCircle } from 'lucide-react'
import type { Order } from '@/contracts/commerce'
import { networkLabels } from '@/contracts/nft'
import { formatEth } from '@/lib/money'
import { isApiError } from '@/lib/http/client'
import { buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ThankYouIcon } from '@/components/common/icons'
import { EmptyState, ErrorState } from '@/components/common/states'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { cartNotices } from '@/features/cart/notices'
import { clearAttempt } from '@/features/checkout/attempt'
import { useOrder, useRealtimeStatus } from '../hooks'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function shortHash(hash: string) {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`.toUpperCase().replace('0X', '0x')
}

/** Receipt: rendered only from the order snapshot, never from the live catalog. */
function Receipt({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] gap-0 overflow-y-auto p-0 sm:max-w-[698px]" data-testid="order-receipt">
        <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-6">
          <ThankYouIcon />
          <DialogTitle className="text-center text-base font-bold tracking-wide text-muted-foreground sm:text-lg">
            Seus NFTs agora estão na sua carteira
          </DialogTitle>
        </div>
        <dl className="grid grid-cols-2 gap-y-4 border-y border-primary px-6 py-4 text-sm sm:grid-cols-4 sm:divide-x sm:divide-primary">
          <div className="sm:px-4">
            <dt className="font-bold">ID da transação</dt>
            <dd className="font-mono" title={order.txHash ?? undefined}>
              {order.txHash ? shortHash(order.txHash) : '—'}
            </dd>
          </div>
          <div className="sm:px-4">
            <dt>Data</dt>
            <dd>{dateFormat.format(new Date(order.updatedAt))}</dd>
          </div>
          <div className="sm:px-4">
            <dt>Total</dt>
            <dd>{formatEth(order.totalEth)}</dd>
          </div>
          <div className="sm:px-4">
            <dt className="font-bold">Carteira</dt>
            <dd>{order.wallet.label}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-4 px-6 py-6 sm:px-14">
          <h2 className="text-base font-bold">Detalhes da transação</h2>
          <table className="w-full text-sm">
            <caption className="sr-only">Itens comprados</caption>
            <thead>
              <tr className="border-b border-border text-left text-base">
                <th scope="col" className="pb-2 font-bold">NFTs</th>
                <th scope="col" className="pb-2 text-center font-bold">Edições</th>
                <th scope="col" className="pb-2 text-right font-bold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={`${line.nftId}-${line.editionId}`}>
                  <td className="py-2">
                    <div className="flex items-center gap-3">
                      <img src={line.image} alt="" width={64} height={64} className="size-14 rounded-sm object-cover sm:size-16" />
                      <div>
                        <p className="font-bold">{line.name}</p>
                        <p className="text-xs text-muted-foreground">ID do token: {line.tokenId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-center text-muted-foreground">(x {line.quantity})</td>
                  <td className="py-2 text-right text-base font-bold text-primary tabular-nums">{formatEth(line.lineTotalEth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto flex w-full max-w-[400px] flex-col gap-2 border-b border-border pb-3 text-base">
            {order.discountEth !== '0' ? (
              <div className="flex justify-between">
                <dt>Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                <dd className="tabular-nums">(-) {formatEth(order.discountEth)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd className="tabular-nums">{formatEth(order.networkFeeEth)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd className="text-primary tabular-nums" data-testid="receipt-total">
                {formatEth(order.totalEth)}
              </dd>
            </div>
          </dl>
          <DialogDescription className="text-center text-sm leading-6 text-muted-foreground">
            Transação confirmada na {networkLabels[order.network]}. A propriedade foi transferida para sua carteira conectada e
            registrada na rede.
          </DialogDescription>
          {order.txHash ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/explorador/tx/$txHash"
                params={{ txHash: order.txHash }}
                className={buttonVariants({ size: 'lg', className: 'text-base' })}
                aria-describedby="explorer-hint"
              >
                Ver no Etherscan
              </Link>
              {/* Label kept from the Figma; the destination is the simulated in-app explorer. */}
              <p id="explorer-hint" className="text-xs text-subtle">
                Link simulado: abre o explorador de demonstração.
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function OrderPage({ orderId }: { orderId: string }) {
  const navigate = useNavigate()
  const order = useOrder(orderId)
  const realtimeStatus = useRealtimeStatus()
  const status = order.data?.status
  useDocumentTitle(status === 'confirmed' ? 'Pedido confirmado' : 'Pedido')

  useEffect(() => {
    if (status === 'confirmed' || status === 'rejected') {
      clearAttempt()
      if (status === 'confirmed') cartNotices.clear()
    }
  }, [status])

  if (order.isPending) {
    return (
      <div className="container-page flex justify-center py-24" aria-busy="true">
        <div className="flex w-full max-w-[698px] flex-col gap-4 bg-card p-8">
          <div className="skeleton mx-auto h-24 w-20" />
          <div className="skeleton mx-auto h-5 w-2/3" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    )
  }

  if (order.isError) {
    const status = isApiError(order.error) ? order.error.status : undefined
    if (status === 404 || status === 403) {
      return (
        <div className="container-page py-16">
          <EmptyState
            title={status === 404 ? 'Pedido não encontrado' : 'Acesso não autorizado'}
            description={
              status === 404
                ? 'Não encontramos um pedido com este identificador.'
                : 'Este pedido pertence a outra conta. Entre com a conta que fez a compra para vê-lo.'
            }
            action={
              <Link to="/" className={buttonVariants()}>
                Voltar ao início
              </Link>
            }
          />
        </div>
      )
    }
    return (
      <div className="container-page py-16">
        <ErrorState error={order.error} onRetry={() => void order.refetch()} retrying={order.isFetching} />
      </div>
    )
  }

  const data = order.data

  if (data.status === 'confirmed') {
    return (
      <>
        <div className="container-page py-24 text-center text-sm text-subtle">Pedido {data.id} confirmado.</div>
        <Receipt order={data} onClose={() => void navigate({ to: '/' })} />
      </>
    )
  }

  if (data.status === 'rejected') {
    return (
      <div className="container-page flex justify-center py-16">
        <section
          aria-labelledby="rejected-title"
          className="flex w-full max-w-[698px] flex-col items-center gap-4 border-b-8 border-b-destructive bg-card px-6 py-10 text-center"
          data-testid="order-rejected"
        >
          <XCircle className="size-12 text-destructive" aria-hidden />
          <h1 id="rejected-title" className="text-xl font-bold">
            Pagamento recusado
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">{data.rejectionReason}</p>
          <p className="text-sm">Nenhum valor foi cobrado e seus itens continuam no carrinho.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link to="/pagamento" className={buttonVariants()}>
              Tentar novamente
            </Link>
            <Link to="/carrinho" className={buttonVariants({ variant: 'outline' })}>
              Voltar ao carrinho
            </Link>
          </div>
          <p className="text-xs text-subtle">Pedido {data.id}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="container-page flex justify-center py-16">
      <section
        aria-labelledby="pending-title"
        aria-busy="true"
        className="flex w-full max-w-[698px] flex-col items-center gap-4 border-b-8 border-b-primary bg-card px-6 py-10 text-center"
        data-testid="order-pending"
      >
        <Loader2 className="size-12 animate-spin text-primary" aria-hidden />
        <h1 id="pending-title" className="text-xl font-bold">
          Aguardando confirmação da rede
        </h1>
        <p role="status" className="max-w-md text-sm text-muted-foreground">
          Seu pedido foi registrado e o pagamento está sendo processado. Você pode recarregar esta página com segurança: nenhuma
          nova compra será criada.
        </p>
        <dl className="grid w-full max-w-sm grid-cols-2 gap-2 text-left text-sm">
          <dt className="text-subtle">Pedido</dt>
          <dd className="text-right font-mono">{data.id}</dd>
          <dt className="text-subtle">Total</dt>
          <dd className="text-right font-bold text-primary">{formatEth(data.totalEth)}</dd>
          <dt className="text-subtle">Itens</dt>
          <dd className="text-right">{data.lines.reduce((sum, line) => sum + line.quantity, 0)}</dd>
        </dl>
        {realtimeStatus !== 'connected' ? (
          <p className="text-xs text-subtle" role="status">
            Conexão em tempo real indisponível. Verificando o status periodicamente…
          </p>
        ) : null}
      </section>
    </div>
  )
}
