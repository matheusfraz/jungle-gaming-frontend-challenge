import { useNavigate } from '@tanstack/react-router'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { HomeView } from '@/features/catalog/components/home-view'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { AuthDialog } from './components/auth-dialog'
import { AuthScreen } from './components/auth-screen'

/** Desktop: dialog over the home page. Mobile: full-screen page. Both follow their Figma frames. */
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
  const isDesktop = useIsDesktop()
  if (!isDesktop) return <AuthScreen mode={mode} redirect={redirect} reason={reason} />
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
