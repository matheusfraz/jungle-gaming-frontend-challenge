import { createFileRoute, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/session'
import { AuthRoute } from '@/features/auth/auth-route'
import { authSearchSchema } from '@/features/auth/search'

function RegisterRoute() {
  const { redirect: to, reason } = Route.useSearch()
  return <AuthRoute mode="register" redirect={to} reason={reason} />
}

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (session) throw redirect({ href: search.redirect ?? '/', replace: true })
  },
  component: RegisterRoute,
})
