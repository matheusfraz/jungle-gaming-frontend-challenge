import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { onSessionInvalid } from '@/lib/session/token'
import { announce } from '@/components/feedback/announce'
import { endSession } from './session'

/** Set while the watcher itself is redirecting, so route guards don't race it. */
export const authRedirectState = { handledByWatcher: false }

export const PROTECTED_PREFIXES = ['/pagamento', '/perfil', '/pedido']

export function isProtectedPath(path: string) {
  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))
}

/** Only same-origin relative paths are accepted as post-login destinations. */
export function safeRedirect(value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : undefined
}

/**
 * Reacts to 401s coming from any request: clears private data and, on a
 * protected screen, sends the user to the login with a way back. Checkout and
 * cart state are kept server-side / in session storage, so nothing is lost.
 */
export function useSessionWatcher() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    let handling = false
    return onSessionInvalid((reason) => {
      if (handling) return
      handling = true
      const { pathname, href } = router.state.location
      const protectedPage = isProtectedPath(pathname)
      authRedirectState.handledByWatcher = protectedPage
      void endSession(queryClient).finally(() => {
        handling = false
      })
      const message =
        reason === 'expired' ? 'Sua sessão expirou. Entre novamente para continuar.' : 'Sua sessão não é mais válida.'
      toast.warning(message)
      announce(message, 'assertive')

      if (protectedPage) {
        void router
          .navigate({ to: '/entrar', search: { redirect: href, reason: 'expired' }, replace: true })
          .finally(() => {
            authRedirectState.handledByWatcher = false
          })
      }
    })
  }, [queryClient, router])
}
