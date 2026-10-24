import { Link, useNavigate } from '@tanstack/react-router'
import { InlineAlert } from '@/components/common/states'
import { LoginForm, SocialButtons } from './auth-dialog'
import { RegisterFlow } from './register-flow'

/** Full-screen login / sign-up from the mobile frames (no dialog over the home). */
export function AuthScreen({ mode, redirect, reason }: { mode: 'login' | 'register'; redirect?: string; reason?: 'expired' }) {
  const navigate = useNavigate()
  const finish = () => void navigate({ href: redirect ?? '/', replace: true })

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 pt-14 pb-10">
      <Link to="/" className="mx-auto text-3xl font-extrabold tracking-[0.3em]" aria-label="Kurio — página inicial">
        KURIO
      </Link>
      <h1 className="mt-14 text-center text-base font-bold tracking-wide">
        {mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
      </h1>
      {reason === 'expired' ? (
        <InlineAlert tone="warning" className="mt-4">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </InlineAlert>
      ) : null}
      <div className="mt-6 flex flex-col gap-6 [&_input]:h-12 [&_input]:rounded-lg [&_button[type=submit]]:h-12">
        {mode === 'login' ? <LoginForm onSuccess={finish} /> : <RegisterFlow onSuccess={finish} submitLabel="Criar perfil" />}
        <SocialButtons />
      </div>
      <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <Link to="/cadastro" search={{ redirect }} replace className="text-foreground hover:text-primary">
              Crie uma conta
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <Link to="/entrar" search={{ redirect }} replace className="text-foreground hover:text-primary">
              Entre
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
