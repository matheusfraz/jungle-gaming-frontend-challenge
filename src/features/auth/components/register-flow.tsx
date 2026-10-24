import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { registerInputSchema, type RegisterInput } from '@/contracts/account'
import { applyServerErrors } from '@/lib/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { InlineAlert } from '@/components/common/states'
import { announce } from '@/components/feedback/announce'
import { useRegister } from '../session'
import { PasswordInput } from './password-input'

/**
 * Sign-up in one step: the account is created and the session starts as soon
 * as the form is valid. The e-mail only needs a valid format and must not be
 * in use yet.
 */
export function RegisterFlow({ onSuccess, submitLabel = 'Criar conta' }: { onSuccess: () => void; submitLabel?: string }) {
  const register = useRegister()
  const [formError, setFormError] = useState<string>()
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const submit = form.handleSubmit((values) => {
    setFormError(undefined)
    register.mutate(values, {
      onSuccess: (response) => {
        announce('Conta criada com sucesso.')
        toast.success(`Conta criada! Bem-vindo, ${response.session.user.displayName}.`)
        onSuccess()
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
      <FormField label="E-mail" required error={errors.email?.message} hint="Use um e-mail válido, como nome@dominio.com." hideLabel>
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
        {register.isPending ? 'Criando conta…' : submitLabel}
      </Button>
    </form>
  )
}
