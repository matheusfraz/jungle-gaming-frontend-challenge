import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Copy, FlaskConical } from 'lucide-react'
import { explorerTransactionSchema } from '@/contracts/commerce'
import { editionLabels, networkLabels } from '@/contracts/nft'
import { isApiError, request } from '@/lib/http/client'
import { formatEth } from '@/lib/money'
import { buttonVariants } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { EmptyState, ErrorState } from '@/components/common/states'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { announce } from '@/components/feedback/announce'

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          announce(`${label} copiado.`)
          window.setTimeout(() => setCopied(false), 2000)
        } catch {
          announce('Não foi possível copiar.', 'assertive')
        }
      }}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm text-primary hover:bg-primary/10"
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      {copied ? <CheckCircle2 className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-subtle">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

/**
 * Simulated block explorer. Purchases are simulated, so their transactions do
 * not exist on a real network: instead of sending people to a public explorer
 * that would answer "not found", the receipt links here.
 */
export function ExplorerPage({ txHash }: { txHash: string }) {
  useDocumentTitle('Explorador simulado')
  const query = useQuery({
    queryKey: ['explorer', txHash],
    queryFn: ({ signal }) =>
      request(explorerTransactionSchema, { url: `/explorer/tx/${encodeURIComponent(txHash)}`, signal }),
    retry: (count, error) => !(isApiError(error) && error.status !== undefined && error.status < 500) && count < 2,
    staleTime: Infinity,
  })

  return (
    <div className="container-page flex flex-col gap-6 py-6">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Explorador simulado' }]} />
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-wider">Detalhes da transação</h1>
        <p
          className="flex items-start gap-2 rounded-sm border border-primary/60 bg-secondary/70 px-4 py-3 text-sm"
          data-testid="explorer-notice"
        >
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong className="font-bold">Explorador simulado.</strong> Esta transação foi gerada pelo ambiente de
            demonstração da Kurio e não existe em uma rede pública.
          </span>
        </p>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-3 bg-card p-5" aria-busy="true" aria-label="Carregando transação">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="skeleton h-6 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        isApiError(query.error) && (query.error.status === 404 || query.error.status === 422) ? (
          <EmptyState
            title="Transação não encontrada"
            description="Não existe uma transação confirmada com este hash no explorador simulado."
            action={
              <Link to="/" className={buttonVariants()}>
                Voltar ao início
              </Link>
            }
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        )
      ) : (
        <section aria-label="Resumo da transação" className="bg-card px-5 py-2" data-testid="explorer-transaction">
          <dl>
            <Row label="Hash da transação">
              <span className="flex items-center gap-2">
                <span className="font-mono break-all" data-testid="explorer-hash">
                  {query.data.hash}
                </span>
                <CopyButton value={query.data.hash} label="Hash da transação" />
              </span>
            </Row>
            <Row label="Status">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/60 px-2.5 py-0.5 text-xs text-success">
                <CheckCircle2 className="size-3.5" aria-hidden /> Sucesso
              </span>
            </Row>
            <Row label="Rede">{networkLabels[query.data.network]} (simulada)</Row>
            <Row label="Bloco">{query.data.blockNumber.toLocaleString('pt-BR')}</Row>
            <Row label="Data">{dateTime.format(new Date(query.data.timestamp))}</Row>
            <Row label="De (carteira)">
              <span className="font-mono break-all">{query.data.from}</span>
            </Row>
            <Row label="Para (contrato)">
              <span className="font-mono break-all">{query.data.to}</span>
            </Row>
            <Row label="Valor">
              <span className="font-bold text-primary">{formatEth(query.data.valueEth)}</span>
            </Row>
            <Row label="Taxa de rede">{formatEth(query.data.networkFeeEth)}</Row>
            <Row label="Tokens transferidos">
              <ul className="flex flex-col gap-1">
                {query.data.transfers.map((transfer) => (
                  <li key={`${transfer.tokenId}-${transfer.editionId}`}>
                    {transfer.quantity}× <strong>{transfer.name}</strong>{' '}
                    <span className="text-subtle">
                      · {transfer.tokenId} · edição {editionLabels[transfer.editionId]}
                    </span>
                  </li>
                ))}
              </ul>
            </Row>
          </dl>
        </section>
      )}
    </div>
  )
}
