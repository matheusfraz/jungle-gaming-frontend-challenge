import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw, SearchX, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isApiError } from '@/lib/http/client'

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border bg-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="text-primary" aria-hidden>
        {icon ?? <SearchX className="size-8" />}
      </span>
      <h2 className="text-base font-bold">{title}</h2>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  )
}

export function ErrorState({
  error,
  title = 'Não foi possível carregar.',
  onRetry,
  retrying,
  className,
}: {
  error: unknown
  title?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  const offline = isApiError(error) && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')
  const message = isApiError(error) ? error.message : 'Ocorreu um erro inesperado.'
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-sm border border-destructive/50 bg-card px-6 py-10 text-center',
        className,
      )}
    >
      <span className="text-destructive" aria-hidden>
        {offline ? <WifiOff className="size-8" /> : <AlertTriangle className="size-8" />}
      </span>
      <h2 className="text-base font-bold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button onClick={onRetry} disabled={retrying} className="mt-1">
          <RefreshCw className={cn(retrying && 'animate-spin')} aria-hidden />
          {retrying ? 'Tentando novamente…' : 'Tentar novamente'}
        </Button>
      ) : null}
    </div>
  )
}

export function InlineAlert({
  tone = 'warning',
  children,
  className,
  action,
}: {
  tone?: 'warning' | 'error' | 'info' | 'success'
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  const tones = {
    warning: 'border-primary/70 bg-secondary/70 text-foreground',
    error: 'border-destructive/70 bg-destructive/10 text-foreground',
    info: 'border-border bg-card text-foreground',
    success: 'border-success/60 bg-success/10 text-foreground',
  }
  const labels = { warning: 'Atenção:', error: 'Erro:', info: 'Info:', success: 'Sucesso:' }
  return (
    <div className={cn('flex flex-wrap items-start gap-3 rounded-sm border px-4 py-3 text-sm', tones[tone], className)}>
      <p className="min-w-0 flex-1">
        <strong className="mr-1 font-bold">{labels[tone]}</strong>
        {children}
      </p>
      {action}
    </div>
  )
}
