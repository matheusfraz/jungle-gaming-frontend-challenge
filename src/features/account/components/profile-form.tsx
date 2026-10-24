import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  avatarInputSchema,
  passwordChangeInputSchema,
  profileInputSchema,
  type PasswordChangeInput,
  type Profile,
  type ProfileInput,
} from '@/contracts/account'
import { applyServerErrors } from '@/lib/forms'
import { errorMessage } from '@/lib/http/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { ErrorState, InlineAlert } from '@/components/common/states'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { announce } from '@/components/feedback/announce'
import { PasswordInput } from '@/features/auth/components/password-input'
import { useChangePassword, useProfile, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from '../hooks'
import { EnsInput } from './fields'

const MAX_AVATAR_BYTES = 1024 * 1024

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

function AvatarField({ profile }: { profile: Profile }) {
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(undefined)
    if (file.size > MAX_AVATAR_BYTES) {
      setError('A imagem deve ter no máximo 1 MB.')
      return
    }
    try {
      const dataUrl = await readAsDataUrl(file)
      const parsed = avatarInputSchema.safeParse({ dataUrl })
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message)
        return
      }
      upload.mutate(dataUrl, {
        onSuccess: () => {
          toast.success('Avatar atualizado.')
          announce('Avatar atualizado.')
        },
        onError: (err) => setError(errorMessage(err)),
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span id="avatar-label" className="text-[15px]">
        Avatar
      </span>
      <div className="flex items-center gap-8">
        <span className="inline-flex size-12 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Seu avatar atual" className="size-full object-cover" data-testid="avatar-image" />
          ) : (
            <ImageIcon className="size-5 text-primary" aria-label="Sem avatar" />
          )}
        </span>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          id="avatar-file"
          aria-labelledby="avatar-label"
          aria-describedby={error ? 'avatar-error' : 'avatar-hint'}
          onChange={(event) => void onFile(event.target.files?.[0])}
          data-testid="avatar-input"
        />
        <Button type="button" onClick={() => input.current?.click()} disabled={upload.isPending} className="h-10 px-6">
          {upload.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        <button
          type="button"
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => announce('Avatar removido.'),
              onError: (err) => setError(errorMessage(err)),
            })
          }
          disabled={!profile.avatarUrl || remove.isPending}
          className="text-[15px] hover:text-primary disabled:opacity-50"
        >
          Remover
        </button>
      </div>
      {error ? (
        <p id="avatar-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id="avatar-hint" className="text-xs text-subtle">
          PNG, JPEG ou WebP com até 1 MB.
        </p>
      )}
    </div>
  )
}

const emptyPassword: PasswordChangeInput = { currentPassword: '', newPassword: '', confirmPassword: '' }

function ProfileFormInner({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string>()
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      ensName: profile.ensName,
      ensSuffix: profile.ensSuffix,
      walletNickname: profile.walletNickname,
    },
  })
  const passwordForm = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeInputSchema),
    defaultValues: emptyPassword,
  })
  const { errors } = form.formState
  const passwordErrors = passwordForm.formState.errors
  const saving = update.isPending || changePassword.isPending

  useEffect(() => {
    if (!form.formState.isDirty)
      form.reset({
        displayName: profile.displayName,
        username: profile.username,
        email: profile.email,
        ensName: profile.ensName,
        ensSuffix: profile.ensSuffix,
        walletNickname: profile.walletNickname,
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.updatedAt])

  const onSave = form.handleSubmit(async (values) => {
    setFormError(undefined)
    const passwordValues = passwordForm.getValues()
    const wantsPassword = Object.values(passwordValues).some(Boolean)
    if (wantsPassword && !(await passwordForm.trigger())) {
      announce('Revise os campos de senha.', 'assertive')
      return
    }
    try {
      await update.mutateAsync(values)
      form.reset(values)
      if (wantsPassword) {
        await changePassword.mutateAsync(passwordValues)
        passwordForm.reset(emptyPassword)
      }
      toast.success(wantsPassword ? 'Perfil e senha atualizados.' : 'Perfil atualizado.')
      announce(wantsPassword ? 'Perfil e senha atualizados.' : 'Perfil atualizado.')
    } catch (error) {
      const profileMessage = applyServerErrors(error, form.setError, ['displayName', 'username', 'email', 'ensName', 'walletNickname'])
      const passwordMessage = applyServerErrors(error, passwordForm.setError, ['currentPassword', 'newPassword', 'confirmPassword'])
      const message = profileMessage && passwordMessage ? profileMessage : undefined
      setFormError(message ?? 'Revise os campos destacados.')
      announce(message ?? 'Revise os campos destacados.', 'assertive')
    }
  }, () => announce('Revise os campos destacados.', 'assertive'))

  return (
    <form onSubmit={onSave} noValidate className="flex flex-col gap-8" aria-labelledby="profile-title">
      <h2 id="profile-title" className="text-lg font-bold tracking-wide">
        Perfil do colecionador
      </h2>
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(props) => <Input {...props} autoComplete="name" {...form.register('displayName')} />}
        </FormField>
        <FormField label="Nome de usuário" required error={errors.username?.message}>
          {(props) => <Input {...props} autoComplete="username" {...form.register('username')} />}
        </FormField>
        <FormField label="E-mail" required error={errors.email?.message}>
          {(props) => <Input {...props} type="email" autoComplete="email" {...form.register('email')} />}
        </FormField>
        <FormField label="Nome ENS" required error={errors.ensName?.message}>
          {(props) => (
            <Controller
              control={form.control}
              name="ensSuffix"
              render={({ field }) => (
                <EnsInput suffix={field.value} onSuffixChange={field.onChange} control={props} inputProps={form.register('ensName')} />
              )}
            />
          )}
        </FormField>
        <FormField label="Apelido da carteira" required error={errors.walletNickname?.message}>
          {(props) => <Input {...props} {...form.register('walletNickname')} />}
        </FormField>
        <AvatarField profile={profile} />
      </div>

      <fieldset className="flex max-w-[580px] flex-col gap-6">
        <legend className="mb-6 text-lg font-bold tracking-wide">Alterar senha</legend>
        <FormField label="Senha atual" error={passwordErrors.currentPassword?.message}>
          {(props) => <PasswordInput {...props} autoComplete="current-password" {...passwordForm.register('currentPassword')} />}
        </FormField>
        <FormField label="Nova senha" error={passwordErrors.newPassword?.message} hint="Mínimo de 8 caracteres, com letras e números.">
          {(props) => <PasswordInput {...props} autoComplete="new-password" {...passwordForm.register('newPassword')} />}
        </FormField>
        <FormField label="Confirmar nova senha" error={passwordErrors.confirmPassword?.message}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" {...passwordForm.register('confirmPassword')} />}
        </FormField>
      </fieldset>

      <div>
        <Button type="submit" size="lg" className="h-12 w-[182px] text-base" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

export function ProfilePage() {
  useDocumentTitle('Meu perfil')
  const profile = useProfile()
  if (profile.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando perfil">
        <div className="skeleton h-6 w-56" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
  return <ProfileFormInner profile={profile.data} />
}
