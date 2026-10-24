import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { walletInputSchema, type Wallet, type WalletInput, type WalletSlot } from '@/contracts/account'
import { applyServerErrors } from '@/lib/forms'
import { errorMessage } from '@/lib/http/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/common/form-field'
import { ErrorState, InlineAlert } from '@/components/common/states'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { announce } from '@/components/feedback/announce'
import { useProfile, useSaveWallet, useSetSecondarySame, useWallets } from '../hooks'
import { fieldHelp, toReferralCode } from '../field-help'
import { EnsInput, NetworkSelect, WalletTypeSelect } from './fields'

const fields = [
  'displayName',
  'nickname',
  'network',
  'profileName',
  'address',
  'secondaryAddress',
  'walletType',
  'referralCode',
  'email',
  'ensName',
  'ensSuffix',
] as const

function toInput(wallet: Wallet | null, defaults: Partial<WalletInput>): WalletInput {
  return {
    displayName: wallet?.displayName ?? defaults.displayName ?? '',
    nickname: wallet?.nickname ?? defaults.nickname ?? '',
    network: wallet?.network ?? 'ethereum',
    profileName: wallet?.profileName ?? defaults.profileName ?? '',
    address: wallet?.address ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    walletType: wallet?.walletType ?? 'metamask',
    referralCode: wallet?.referralCode ?? '',
    email: wallet?.email ?? defaults.email ?? '',
    ensName: wallet?.ensName ?? defaults.ensName ?? '',
    ensSuffix: wallet?.ensSuffix ?? '.eth',
  }
}

function WalletForm({
  slot,
  wallet,
  defaults,
  onSaved,
}: {
  slot: WalletSlot
  wallet: Wallet | null
  defaults: Partial<WalletInput>
  onSaved?: () => void
}) {
  const save = useSaveWallet()
  const [formError, setFormError] = useState<string>()
  const form = useForm<WalletInput>({
    resolver: zodResolver(walletInputSchema),
    defaultValues: toInput(wallet, defaults),
  })
  const { errors } = form.formState
  const label = slot === 'primary' ? 'principal' : 'secundária'

  const submit = form.handleSubmit(
    (values) => {
      setFormError(undefined)
      save.mutate(
        { slot, input: values },
        {
          onSuccess: () => {
            form.reset(values)
            toast.success(`Carteira ${label} salva.`)
            announce(`Carteira ${label} salva.`)
            onSaved?.()
          },
          onError: (error) => {
            const message = applyServerErrors(error, form.setError, fields)
            setFormError(message ?? 'Revise os campos destacados.')
            announce(message ?? errorMessage(error), 'assertive')
          },
        },
      )
    },
    () => announce('Revise os campos destacados.', 'assertive'),
  )

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6" aria-label={`Carteira ${label}`} data-testid={`wallet-form-${slot}`}>
      {formError ? <InlineAlert tone="error">{formError}</InlineAlert> : null}
      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(props) => <Input {...props} {...form.register('displayName')} />}
        </FormField>
        <FormField label="Apelido da carteira" required error={errors.nickname?.message} hint={fieldHelp.nickname}>
          {(props) => <Input {...props} {...form.register('nickname')} />}
        </FormField>
        <FormField label="Rede" required error={errors.network?.message}>
          {(props) => (
            <Controller
              control={form.control}
              name="network"
              render={({ field }) => <NetworkSelect value={field.value} onChange={field.onChange} control={props} />}
            />
          )}
        </FormField>
        <FormField label="Nome do perfil" required error={errors.profileName?.message} hint={fieldHelp.profileName}>
          {(props) => <Input {...props} {...form.register('profileName')} />}
        </FormField>
        <FormField label="Endereço da carteira" required error={errors.address?.message} hint={fieldHelp.address}>
          {(props) => <Input {...props} placeholder="Endereço 0x da carteira" {...form.register('address')} />}
        </FormField>
        <FormField
          label="ENS ou carteira secundária (opcional)"
          hideLabel
          error={errors.secondaryAddress?.message}
          hint={fieldHelp.secondaryAddress}
          className="md:pt-7"
        >
          {(props) => <Input {...props} placeholder="ENS ou carteira secundária (opcional)" {...form.register('secondaryAddress')} />}
        </FormField>
        <FormField label="Tipo de carteira" required error={errors.walletType?.message}>
          {(props) => (
            <Controller
              control={form.control}
              name="walletType"
              render={({ field }) => <WalletTypeSelect value={field.value} onChange={field.onChange} control={props} />}
            />
          )}
        </FormField>
        <FormField label="Código de indicação" required error={errors.referralCode?.message} hint={fieldHelp.referralCode}>
          {(props) => <Input {...props} className="uppercase" {...form.register('referralCode', { setValueAs: toReferralCode })} />}
        </FormField>
        <FormField label="E-mail" required error={errors.email?.message}>
          {(props) => <Input {...props} type="email" autoComplete="email" {...form.register('email')} />}
        </FormField>
        <FormField label="Nome ENS" required error={errors.ensName?.message} hint={fieldHelp.ensName}>
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
      </div>
      <div>
        <Button type="submit" size="lg" className="h-12 min-w-[182px] text-base" disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
      </div>
    </form>
  )
}

export function WalletsPage() {
  useDocumentTitle('Carteiras')
  const wallets = useWallets()
  const profile = useProfile()
  const setSame = useSetSecondarySame()
  const [showSecondary, setShowSecondary] = useState(false)
  const [showPrimary, setShowPrimary] = useState(false)

  if (wallets.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando carteiras">
        <div className="skeleton h-6 w-56" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="skeleton h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }
  if (wallets.isError) return <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} retrying={wallets.isFetching} />

  const { primary, secondary, secondarySameAsPrimary } = wallets.data
  const defaults: Partial<WalletInput> = {
    displayName: profile.data?.displayName,
    profileName: profile.data?.username,
    email: profile.data?.email,
    ensName: profile.data?.ensName,
    nickname: profile.data?.walletNickname,
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="primary-title" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="primary-title" className="text-lg font-bold tracking-wide">
              Carteira principal
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
            </p>
          </div>
          {!primary && !showPrimary ? (
            <button type="button" onClick={() => setShowPrimary(true)} className="text-base font-bold text-primary hover:underline">
              Adicionar
            </button>
          ) : primary ? (
            <span className="text-xs text-subtle">Salva em {new Date(primary.updatedAt).toLocaleDateString('pt-BR')}</span>
          ) : null}
        </div>
        {primary || showPrimary ? (
          <WalletForm key={primary?.id ?? 'new-primary'} slot="primary" wallet={primary} defaults={defaults} />
        ) : (
          <p className="text-sm text-muted-foreground">Você ainda não adicionou uma carteira principal.</p>
        )}
      </section>

      <section aria-labelledby="secondary-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="secondary-title" className="text-lg font-bold tracking-wide">
              Carteira secundária
            </h2>
            {!secondary && !showSecondary && !secondarySameAsPrimary ? (
              <p className="mt-1 text-sm text-muted-foreground">Você ainda não adicionou uma carteira secundária.</p>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="same-as-primary"
                className="rounded-full"
                checked={secondarySameAsPrimary}
                disabled={!primary || setSame.isPending}
                onCheckedChange={(checked) =>
                  setSame.mutate(checked === true, {
                    onSuccess: () => announce(checked === true ? 'Carteira secundária igual à principal.' : 'Carteira secundária independente.'),
                    onError: (error) => toast.error(errorMessage(error)),
                  })
                }
              />
              <label htmlFor="same-as-primary" className="text-[15px]">
                Igual à carteira principal
              </label>
            </div>
            {!secondary && !showSecondary && !secondarySameAsPrimary ? (
              <button type="button" onClick={() => setShowSecondary(true)} className="text-base font-bold text-primary hover:underline">
                Adicionar
              </button>
            ) : null}
          </div>
        </div>
        {secondarySameAsPrimary ? (
          <p className="text-sm text-muted-foreground">Os NFTs também podem ser recebidos na carteira principal.</p>
        ) : secondary || showSecondary ? (
          <WalletForm key={secondary?.id ?? 'new-secondary'} slot="secondary" wallet={secondary} defaults={defaults} />
        ) : null}
      </section>
    </div>
  )
}
