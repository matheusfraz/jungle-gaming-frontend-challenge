import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  registerInputSchema,
  verifySignupInputSchema,
  type PendingSignup,
  type RegisterInput,
} from '@/contracts/account'
import { applyServerErrors } from '@/lib/forms'
import { errorMessage, isApiError } from '@/lib/http/client'
import { readStorage, removeStorage, storageKeys, writeStorage } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { InlineAlert } from '@/components/common/states'
import { announce } from '@/components/feedback/announce'
import { useRegister, useResendSignupCode, useVerifySignup } from '../session'
import { PasswordInput } from './password-input'

const savePending = (pending: PendingSignup) => writeStorage(storageKeys.pendingSignup, pending, 'session')
const clearPending = () => removeStorage(storageKeys.pendingSignup, 'session')

function RegisterForm({
  onCodeSent,
  initialError,
}: {
  onCodeSent: (pending: PendingSignup) => void
  initialError?: string
}) {
  const register = useRegister()
  const [formError, setFormError] = useState<string | undefined>(initialError)
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const submit = form.handleSubmit((values) => {
    setFormError(undefined)
    register.mutate(values, {
      onSuccess: (pending) => {
        announce(`Enviamos um código de confirmação para ${pending.email}.`)
        onCodeSent(pending)
      },
      onError: (error) => {
        const message = applyServerErrors(error, form.setError, ['username', 'email', 'password', 'confirmPassword'])
        setFormError(message ?? 'Já existe uma conta com esses dados. Revise os campos destacados.')
        announce(message ?? 'Já existe uma conta com esses dados.', 'assertive')
      },
    })
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Criar conta">
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}
      <FormField label="Nome de usuário" required error={errors.username?.message} hint="Letras minúsculas, números e _." hideLabel>
        {(props) => <Input {...props} autoComplete="username" placeholder="Nome de usuário" {...form.register('username')} />}
      </FormField>
      <FormField label="E-mail" required error={errors.email?.message} hint="Vamos enviar um código para confirmar." hideLabel>
        {(props) => <Input {...props} type="email" autoComplete="email" placeholder="Digite seu e-mail" {...form.register('email')} />}
      </FormField>
      <FormField label="Senha" required error={errors.password?.message} hint="Mínimo de 8 caracteres, com letras e números." hideLabel>
        {(props) => <PasswordInput {...props} autoComplete="new-password" placeholder="Senha" {...form.register('password')} />}
      </FormField>
      <FormField label="Confirmar senha" required error={errors.confirmPassword?.message} hideLabel>
        {(props) => (
          <PasswordInput {...props} autoComplete="new-password" placeholder="Confirmar senha" {...form.register('confirmPassword')} />
        )}
      </FormField>
      <Button type="submit" size="lg" className="h-11 text-sm" disabled={register.isPending}>
        {register.isPending ? 'Enviando código…' : 'Criar conta'}
      </Button>
    </form>
  )
}

function useSecondsUntil(iso: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000))
}

function VerifyEmailStep({
  pending,
  onPendingChange,
  onBack,
  onSuccess,
}: {
  pending: PendingSignup
  onPendingChange: (pending: PendingSignup) => void
  onBack: (error?: string) => void
  onSuccess: () => void
}) {
  const verify = useVerifySignup()
  const resend = useResendSignupCode()
  const [formError, setFormError] = useState<string>()
  const [resent, setResent] = useState(false)
  const input = useRef<HTMLInputElement | null>(null)
  const resendIn = useSecondsUntil(pending.resendAvailableAt)
  const form = useForm<{ verificationId: string; code: string }>({
    resolver: zodResolver(verifySignupInputSchema),
    defaultValues: { verificationId: pending.verificationId, code: '' },
  })
  const { errors } = form.formState
  const codeField = form.register('code')

  useEffect(() => {
    input.current?.focus()
  }, [])

  const submit = form.handleSubmit((values) => {
    setFormError(undefined)
    verify.mutate(values, {
      onSuccess: (response) => {
        clearPending()
        announce('E-mail confirmado. Conta criada com sucesso.')
        toast.success(`E-mail confirmado! Bem-vindo, ${response.session.user.displayName}.`)
        onSuccess()
      },
      onError: (error) => {
        if (isApiError(error) && (error.status === 404 || error.code === 'CONFLICT')) {
          // The pending sign-up is gone or the e-mail/username was taken meanwhile.
          clearPending()
          onBack(error.message)
          return
        }
        const message = applyServerErrors(error, form.setError, ['code'])
        if (message) setFormError(message)
        announce(isApiError(error) ? error.message : errorMessage(error), 'assertive')
      },
    })
  })

  const onResend = () => {
    setFormError(undefined)
    resend.mutate(pending.verificationId, {
      onSuccess: (next) => {
        savePending(next)
        onPendingChange(next)
        setResent(true)
        form.resetField('code')
        form.clearErrors('code')
        announce(`Enviamos um novo código para ${next.email}.`)
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 404) {
          clearPending()
          onBack(error.message)
          return
        }
        setFormError(errorMessage(error))
      },
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Confirmar e-mail" data-testid="verify-email">
      <div className="flex flex-col items-center gap-2 text-center">
        <MailCheck className="size-8 text-primary" aria-hidden />
        <h2 className="text-base font-bold">Confirme seu e-mail</h2>
        <p className="text-xs leading-5 text-muted-foreground">
          Enviamos um código de 6 dígitos para <strong className="text-foreground">{pending.email}</strong>. Ele vale por
          10 minutos.
        </p>
      </div>
      {resent ? (
        <p role="status" className="text-center text-xs text-success">
          Novo código enviado.
        </p>
      ) : null}
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}
      <FormField label="Código de confirmação" required error={errors.code?.message}>
        {(props) => (
          <Input
            {...props}
            {...codeField}
            ref={(element) => {
              codeField.ref(element)
              input.current = element
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center font-mono text-lg tracking-[0.5em]"
          />
        )}
      </FormField>
      <Button type="submit" size="lg" className="h-11 text-sm" disabled={verify.isPending}>
        {verify.isPending ? 'Confirmando…' : 'Confirmar e criar conta'}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            clearPending()
            onBack()
          }}
          className="text-subtle hover:text-primary"
        >
          Alterar e-mail
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={resendIn > 0 || resend.isPending}
          className="text-primary hover:underline disabled:cursor-not-allowed disabled:text-subtle disabled:no-underline"
        >
          {resend.isPending ? 'Reenviando…' : resendIn > 0 ? `Reenviar código em ${resendIn} s` : 'Reenviar código'}
        </button>
      </div>
    </form>
  )
}

/**
 * Sign-up in two steps: form → e-mail confirmation code. The pending step is
 * kept in sessionStorage so a refresh does not lose it.
 */
export function RegisterFlow({ onSuccess }: { onSuccess: () => void }) {
  const [pending, setPending] = useState<PendingSignup | null>(() =>
    readStorage<PendingSignup>(storageKeys.pendingSignup, 'session'),
  )
  const [backError, setBackError] = useState<string>()

  if (pending) {
    return (
      <VerifyEmailStep
        pending={pending}
        onPendingChange={setPending}
        onBack={(error) => {
          setBackError(error)
          setPending(null)
        }}
        onSuccess={onSuccess}
      />
    )
  }

  return (
    <RegisterForm
      key={backError ?? 'form'}
      initialError={backError}
      onCodeSent={(next) => {
        savePending(next)
        setBackError(undefined)
        setPending(next)
      }}
    />
  )
}
