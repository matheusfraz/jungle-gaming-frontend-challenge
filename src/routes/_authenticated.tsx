import { useEffect } from 'react'
import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import { sessionQueryOptions, useSession } from '@/features/auth/session'
import { authRedirectState } from '@/features/auth/use-session-watcher'

/** Keeps a protected page from rendering private data after logout/expiry. */
function AuthenticatedLayout() {
  const { user, isPending } = useSession()
  const navigate = useNavigate()
  const { href } = useLocation()

  useEffect(() => {
    if (!isPending && !user && !authRedirectState.handledByWatcher) void navigate({ to: '/entrar', search: { redirect: href }, replace: true })
  }, [isPending, user, navigate, href])

  if (!user) return null
  return <Outlet />
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: '/entrar', search: { redirect: location.href } })
    }
    return { session }
  },
  component: AuthenticatedLayout,
})
