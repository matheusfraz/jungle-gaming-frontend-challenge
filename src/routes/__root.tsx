import { lazy, Suspense, useEffect, useRef } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useLocation, type ErrorComponentProps } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LiveRegion } from '@/components/feedback/live-region'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { useSessionWatcher } from '@/features/auth/use-session-watcher'
import { useRealtimeSync } from '@/realtime/use-realtime-sync'

const MockPanel = import.meta.env.VITE_ENABLE_MOCKS === 'true' ? lazy(() => import('@/mocks/panel')) : null

export interface RouterContext {
  queryClient: QueryClient
}

/** Moves focus to the main region after client-side page changes (not on first load). */
function useRouteFocus() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    // Compare with the previous path (StrictMode runs effects twice on mount).
    if (previous.current === pathname) return
    previous.current = pathname
    if (pathname.startsWith('/entrar') || pathname.startsWith('/cadastro')) return
    document.getElementById('conteudo')?.focus({ preventScroll: true })
  }, [pathname])
}

function RootLayout() {
  useRealtimeSync()
  useSessionWatcher()
  useRouteFocus()

  return (
    <TooltipProvider>
      <a
        href="#conteudo"
        className="sr-only-focusable fixed top-2 left-2 z-[100] rounded-sm bg-primary px-4 py-2 font-bold text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-screen flex-col overflow-x-clip">
        <SiteHeader />
        <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster position="bottom-right" closeButton />
      <LiveRegion />
      {MockPanel ? (
        <Suspense fallback={null}>
          <MockPanel />
        </Suspense>
      ) : null}
    </TooltipProvider>
  )
}

export function NotFoundPage() {
  return (
    <section className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço que você acessou não existe ou foi movido. Que tal voltar ao mercado?
      </p>
      <div className="flex gap-3">
        <Link to="/" className={buttonVariants()}>
          Ir para o início
        </Link>
        <Link to="/mercado" className={buttonVariants({ variant: 'outline' })}>
          Explorar o mercado
        </Link>
      </div>
    </section>
  )
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <section role="alert" className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-xl font-bold">Algo deu errado nesta página.</h1>
      <p className="max-w-md text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Erro inesperado.'}</p>
      <button type="button" onClick={reset} className={buttonVariants()}>
        Tentar novamente
      </button>
    </section>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RootError,
})
