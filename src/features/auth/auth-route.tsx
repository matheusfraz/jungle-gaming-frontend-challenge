import { useNavigate } from '@tanstack/react-router'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { HomeView } from '@/features/catalog/components/home-view'
import { AuthDialog } from './components/auth-dialog'

/** Login/register render as a dialog over the home page, like the Figma frames. */
export function AuthRoute({
  mode,
  redirect,
  reason,
}: {
  mode: 'login' | 'register'
  redirect?: string
  reason?: 'expired'
}) {
  useDocumentTitle(mode === 'login' ? 'Entrar' : 'Criar conta')
  const navigate = useNavigate()
  return (
    <>
      <div inert>
        <HomeView
          search={{}}
          onSearch={(patch) => void navigate({ to: '/', search: (prev) => ({ ...prev, ...patch }) })}
        />
      </div>
      <AuthDialog mode={mode} redirect={redirect} reason={reason} />
    </>
  )
}
