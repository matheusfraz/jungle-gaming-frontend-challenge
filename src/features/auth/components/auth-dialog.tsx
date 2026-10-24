import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginInputSchema, type LoginInput } from '@/contracts/account'
import { applyServerErrors } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FormField } from '@/components/common/form-field'
import { FacebookColorIcon, GoogleIcon } from '@/components/common/icons'
import { InlineAlert } from '@/components/common/states'
import { announce } from '@/components/feedback/announce'
import { useLogin } from '../session'
import { isProtectedPath } from '../use-session-watcher'
import { PasswordInput } from './password-input'
import { RegisterFlow } from './register-flow'

type Mode = 'login' | 'register'

export function SocialButtons() {
  const [notice, setNotice] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-xs">Ou continue com</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      {(['Google', 'Facebook'] as const).map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => setNotice(true)}
          className="flex h-10 items-center justify-center gap-3 rounded-sm border border-border text-xs text-muted-foreground hover:border-primary"
        >
          {provider === 'Google' ? <GoogleIcon /> : <FacebookColorIcon />}
          Continuar com {provider}
        </button>
      ))}
      {notice ? (
        <p role="status" className="text-center text-xs text-subtle">
          O login social não está disponível nesta demonstração. Use e-mail e senha.
        </p>
      ) : null}
    </div>
  )
}

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const [formError, setFormError] = useState<string>()
  const [forgot, setForgot] = useState(false)
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  const submit = form.handleSubmit((values) => {
    setFormError(undefined)
    login.mutate(values, {
      onSuccess: (response) => {
        announce(`Bem-vindo, ${response.session.user.displayName}.`)
        toast.success(`Bem-vindo, ${response.session.user.displayName}!`)
        onSuccess()
      },
      onError: (error) => {
        const message = applyServerErrors(error, form.setError, ['email', 'password'])
        setFormError(message)
        if (message) announce(message, 'assertive')
      },
    })
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Entrar">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}
      <FormField label="E-mail" required error={errors.email?.message} hideLabel>
        {(props) => <Input {...props} type="email" autoComplete="email" placeholder="contato@email.com" {...form.register('email')} />}
      </FormField>
      <FormField label="Senha" required error={errors.password?.message} hideLabel>
        {(props) => (
          <PasswordInput {...props} autoComplete="current-password" placeholder="Senha" {...form.register('password')} />
        )}
      </FormField>
      <div className="-mt-2 text-right">
        <button type="button" onClick={() => setForgot(true)} className="text-xs text-primary hover:underline">
          Esqueceu a senha?
        </button>
        {forgot ? (
          <p role="status" className="mt-1 text-xs text-subtle">
            A recuperação de senha não faz parte desta demonstração. Use as credenciais fictícias do README.
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="h-11 text-sm" disabled={login.isPending}>
        {login.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

export function AuthDialog({ mode, redirect, reason }: { mode: Mode; redirect?: string; reason?: 'expired' }) {
  const navigate = useNavigate()

  const finish = () => void navigate({ href: redirect ?? '/', replace: true })
  const close = () => {
    // Never bounce back into a protected page the user did not sign in for.
    void navigate({ href: redirect && !isProtectedPath(redirect) ? redirect : '/', replace: true })
  }

  const tabClass = (active: boolean) =>
    cn('text-lg tracking-wide', active ? 'text-primary' : 'text-foreground hover:text-primary')

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[92vh] gap-6 overflow-y-auto px-6 pt-10 pb-10 sm:max-w-[505px] sm:px-20">
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Acesso à conta">
          <Link
            to="/entrar"
            search={{ redirect }}
            replace
            role="tab"
            aria-selected={mode === 'login'}
            className={tabClass(mode === 'login')}
          >
            Entrar
          </Link>
          <span aria-hidden className="h-5 w-px bg-primary" />
          <Link
            to="/cadastro"
            search={{ redirect }}
            replace
            role="tab"
            aria-selected={mode === 'register'}
            className={tabClass(mode === 'register')}
          >
            Criar conta
          </Link>
        </div>
        <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>
        <DialogDescription className="text-center text-xs text-foreground">
          {mode === 'login'
            ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
            : 'Crie seu perfil de colecionador. Leva menos de um minuto.'}
        </DialogDescription>
        {reason === 'expired' ? (
          <InlineAlert tone="warning">Sua sessão expirou. Entre novamente para continuar de onde parou.</InlineAlert>
        ) : null}
        {mode === 'login' ? <LoginForm onSuccess={finish} /> : <RegisterFlow onSuccess={finish} />}
        <SocialButtons />
      </DialogContent>
    </Dialog>
  )
}
