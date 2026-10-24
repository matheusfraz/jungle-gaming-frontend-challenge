import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, MoreVertical, PlugZap, Unplug, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { collectorFormSchema, type CollectorForm } from '@/contracts/checkout'
import { quoteStaleDetailsSchema, type CreateOrderInput, type Quote, type QuoteLine } from '@/contracts/commerce'
import { walletTypeLabels, type Wallet, type WalletsResponse, type WalletType } from '@/contracts/account'
import { editionLabels, networkLabels } from '@/contracts/nft'
import { errorMessage, isApiError } from '@/lib/http/client'
import { applyServerErrors } from '@/lib/forms'
import { formatEth, multiplyMoney } from '@/lib/money'
import { queryKeys } from '@/lib/query/keys'
import { readStorage, removeStorage, storageKeys, writeStorage } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { MobileTopBar } from '@/components/layout/mobile-chrome'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { FormField } from '@/components/common/form-field'
import { EmptyState, ErrorState, InlineAlert } from '@/components/common/states'
import { WalletBadges } from '@/components/common/wallet-badges'
import { useDocumentTitle } from '@/components/common/use-document-title'
import { announce } from '@/components/feedback/announce'
import { realtime } from '@/realtime/client'
import { useSession } from '@/features/auth/session'
import { createQuote, useCart, useCartQuote } from '@/features/cart/hooks'
import { CartNotices } from '@/features/cart/components/cart-notices'
import { SummaryRows } from '@/features/cart/components/order-summary'
import { useProfile, useWalletConnection, useWallets } from '@/features/account/hooks'
import { EnsInput, NetworkSelect, WalletTypeSelect } from '@/features/account/components/fields'
import { shortAddress } from '@/lib/format'
import { createOrder } from '@/features/orders/hooks'
import { attemptFor, clearAttempt, markAttemptDone, readAttempt, type CheckoutAttempt } from '../attempt'

const RECOVERY_WINDOW_MS = 15 * 60_000
const AUTO_RETRIES = 2

interface Draft {
  userId: string
  values: CollectorForm
  walletId: string | null
  useOtherWallet: boolean
}

const emptyForm: CollectorForm = {
  displayName: '',
  username: '',
  network: 'ethereum',
  profileName: '',
  walletAddress: '',
  secondaryAddress: '',
  walletType: 'metamask',
  referralCode: '',
  email: '',
  ensName: '',
  ensSuffix: '.eth',
  note: '',
}

function walletList(data: WalletsResponse | undefined): Wallet[] {
  if (!data) return []
  return [data.primary, data.secondarySameAsPrimary ? null : data.secondary].filter((wallet): wallet is Wallet => Boolean(wallet))
}

function LineItem({ line }: { line: Pick<QuoteLine, 'name' | 'tokenId' | 'image' | 'imageAlt' | 'quantity' | 'editionId'> & { total: string } }) {
  return (
    <li className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 bg-card pr-3">
      <img src={line.image} alt={line.imageAlt} width={64} height={64} loading="lazy" className="aspect-square w-16 object-cover" />
      <div className="min-w-0 py-2">
        <p className="truncate text-sm font-bold">{line.name}</p>
        <p className="text-xs text-muted-foreground">ID do token: {line.tokenId}</p>
        <p className="text-xs text-subtle">
          Edição {editionLabels[line.editionId]} · (x {line.quantity})
        </p>
      </div>
      <p className="text-base font-bold text-primary tabular-nums">{formatEth(line.total)}</p>
    </li>
  )
}

export function CheckoutPage() {
  useDocumentTitle('Pagamento')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user!.id
  const cart = useCart()
  const wallets = useWallets()
  const profile = useProfile()
  const { connect, disconnect } = useWalletConnection()

  const draft = readStorage<Draft>(storageKeys.checkoutDraft, 'session')
  const ownDraft = draft?.userId === userId ? draft : null

  const form = useForm<CollectorForm>({
    resolver: zodResolver(collectorFormSchema),
    defaultValues: ownDraft?.values ?? emptyForm,
  })
  const { errors } = form.formState
  const network = form.watch('network')

  const [step, setStep] = useState<'form' | 'review'>('form')
  const isDesktop = useIsDesktop()
  /** Mobile: the collector data (filled from the wallet) is collapsed by default. */
  const [collectorOpen, setCollectorOpen] = useState(false)
  const [walletId, setWalletId] = useState<string | null>(ownDraft?.walletId ?? null)
  const [useOtherWallet, setUseOtherWallet] = useState(ownDraft?.useOtherWallet ?? false)
  const [walletError, setWalletError] = useState<string>()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [stale, setStale] = useState<string[] | null>(null)
  const [changedNotice, setChangedNotice] = useState<string[] | null>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'retrying' | 'failed' | 'recovering'>('idle')
  const [submitError, setSubmitError] = useState<string>()
  const inFlight = useRef(false)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  // Only a draft the user actually filled counts; otherwise prefill from the wallet/profile.
  const prefilled = useRef(Boolean(ownDraft?.values.walletAddress))

  const liveQuote = useCartQuote(cart.data, network)
  const registered = walletList(wallets.data)
  // A restored draft may point to a wallet that no longer exists: fall back to the first one.
  const selectedWallet = registered.find((wallet) => wallet.id === walletId) ?? registered[0] ?? null
  const connection = selectedWallet ? wallets.data?.connections[selectedWallet.id] ?? 'disconnected' : null

  const fillFromWallet = (wallet: Wallet, keepAddress: boolean) => {
    const current = form.getValues()
    form.reset({
      ...current,
      displayName: wallet.displayName,
      profileName: wallet.profileName,
      network: wallet.network,
      walletType: wallet.walletType,
      referralCode: wallet.referralCode,
      email: wallet.email,
      ensName: wallet.ensName,
      ensSuffix: wallet.ensSuffix,
      walletAddress: keepAddress ? current.walletAddress : wallet.address,
      secondaryAddress: keepAddress ? current.secondaryAddress : wallet.secondaryAddress,
      username: current.username || profile.data?.username || '',
    })
  }

  // Prefill once from the primary wallet + profile (unless a draft was restored).
  useEffect(() => {
    if (prefilled.current || !wallets.data || !profile.data) return
    prefilled.current = true
    const first = walletList(wallets.data)[0]
    form.setValue('username', profile.data.username)
    form.setValue('email', profile.data.email)
    form.setValue('displayName', profile.data.displayName)
    if (first) {
      setWalletId(first.id)
      fillFromWallet(first, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.data, profile.data])

  // Persist the draft so an expired session or a refresh never loses the form.
  useEffect(() => {
    const subscription = form.watch((values) => {
      writeStorage(
        storageKeys.checkoutDraft,
        { userId, values: { ...emptyForm, ...values }, walletId, useOtherWallet } satisfies Draft,
        'session',
      )
    })
    return () => subscription.unsubscribe()
  }, [form, userId, walletId, useOtherWallet])

  // A quote under review becomes stale when an item changes in realtime.
  useEffect(() => {
    if (!quote) return
    return realtime.on('nft.updated', (event) => {
      const line = quote.lines.find((item) => item.nftId === event.resource.id)
      if (!line || event.version <= line.nftVersion) return
      const reasons: string[] = []
      if (event.data.priceEth !== line.unitPriceEth)
        reasons.push(`${line.name}: ${formatEth(line.unitPriceEth)} → ${formatEth(event.data.priceEth)}`)
      const available = event.data.editions.find((edition) => edition.id === line.editionId)?.available ?? 0
      if (available < line.quantity) reasons.push(`${line.name}: só ${available} disponível(is)`)
      // Other changes (e.g. units reserved by this very order) keep the quote valid.
      if (!reasons.length) return
      setStale((previous) => [...(previous ?? []), ...reasons])
      announce('Os valores do seu pedido mudaram. Atualize a revisão antes de confirmar.', 'assertive')
    })
  }, [quote])

  const quoteMutation = useMutation({
    mutationFn: () =>
      createQuote({
        items: cart.data!.items.map((item) => ({ nftId: item.nftId, editionId: item.editionId, quantity: item.quantity })),
        couponCode: cart.data!.couponCode,
        network: form.getValues('network'),
      }),
  })

  const goToReview = async (previous?: Quote | null) => {
    try {
      const fresh = await quoteMutation.mutateAsync()
      if (previous && previous.hash !== fresh.hash) {
        const changes = fresh.lines
          .map((line) => {
            const old = previous.lines.find((item) => item.nftId === line.nftId && item.editionId === line.editionId)
            return old && old.unitPriceEth !== line.unitPriceEth
              ? `${line.name}: ${formatEth(old.unitPriceEth)} → ${formatEth(line.unitPriceEth)}`
              : null
          })
          .filter((change): change is string => Boolean(change))
        setChangedNotice(changes.length ? changes : ['Taxas, cupom ou disponibilidade foram atualizados.'])
      }
      setQuote(fresh)
      setStale(null)
      setStep('review')
      setSubmitError(undefined)
      requestAnimationFrame(() => reviewHeading.current?.focus())
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const onContinue = form.handleSubmit(
    async () => {
      if (!selectedWallet) {
        setWalletError('Selecione uma carteira cadastrada para pagar.')
        return
      }
      setWalletError(undefined)
      if (connection !== 'connected') {
        // Ask the (simulated) wallet to connect, as a real dApp would, instead
        // of stopping the user with an error. A refusal is still reported.
        try {
          await connect.mutateAsync({ walletId: selectedWallet.id, network: form.getValues('network') })
          announce(`${walletTypeLabels[selectedWallet.walletType]} conectada.`)
        } catch (error) {
          setWalletError(errorMessage(error))
          announce(errorMessage(error), 'assertive')
          return
        }
      }
      setChangedNotice(null)
      await goToReview()
    },
    () => {
      setCollectorOpen(true)
      announce('Revise os campos destacados no formulário.', 'assertive')
    },
  )

  const send = async (attempt: CheckoutAttempt, tries = 0): Promise<void> => {
    inFlight.current = true
    setSubmitState(tries === 0 ? 'sending' : 'retrying')
    writeStorage(storageKeys.checkoutAttempt, { ...attempt, sentAt: Date.now() }, 'session')
    try {
      const order = await createOrder(attempt.payload, attempt.key)
      markAttemptDone(attempt, order.id)
      removeStorage(storageKeys.checkoutDraft, 'session')
      queryClient.setQueryData(queryKeys.order(userId, order.id), order)
      announce('Pedido enviado. Aguardando confirmação da rede.')
      setSubmitState('idle')
      void navigate({ to: '/pedido/$orderId', params: { orderId: order.id } })
    } catch (error) {
      if (!isApiError(error)) {
        setSubmitState('failed')
        setSubmitError(errorMessage(error))
        return
      }
      if (error.isTransient && tries < AUTO_RETRIES) {
        announce('Sem resposta do servidor. Verificando seu pedido com segurança…')
        await new Promise((resolve) => setTimeout(resolve, 800 * (tries + 1)))
        return send(attempt, tries + 1)
      }
      setSubmitState(error.isTransient ? 'failed' : 'idle')
      switch (error.code) {
        case 'QUOTE_STALE':
        case 'AVAILABILITY_CONFLICT': {
          const details = quoteStaleDetailsSchema.safeParse(error.details)
          clearAttempt()
          if (details.success) {
            setQuote(details.data.quote)
            setStale(null)
            setChangedNotice(details.data.changes)
          } else {
            setQuote(null)
            setStep('form')
          }
          setSubmitError(error.message)
          announce(`${error.message} Revise os novos valores e confirme novamente.`, 'assertive')
          break
        }
        case 'WALLET_NOT_CONNECTED':
          if (selectedWallet)
            queryClient.setQueryData<WalletsResponse>(queryKeys.wallets(userId), (data) =>
              data ? { ...data, connections: { ...data.connections, [selectedWallet.id]: 'disconnected' } } : data,
            )
          clearAttempt()
          setStep('form')
          setWalletError(error.message)
          break
        case 'VALIDATION_ERROR': {
          clearAttempt()
          setStep('form')
          const message = applyServerErrors(error, form.setError, Object.keys(emptyForm) as (keyof CollectorForm)[])
          setSubmitError(message)
          break
        }
        case 'IDEMPOTENCY_CONFLICT':
          clearAttempt()
          setSubmitError(`${error.message} Tente confirmar novamente.`)
          break
        case 'UNAUTHORIZED':
        case 'SESSION_EXPIRED':
          // The session watcher redirects to login; the attempt stays saved for recovery.
          break
        default:
          setSubmitError(
            error.isTransient
              ? 'Não conseguimos confirmar o envio do seu pedido. Nenhuma cobrança duplicada será feita: tente novamente para recuperar a mesma compra.'
              : error.message,
          )
      }
      if (error.isTransient) announce('Não conseguimos confirmar o envio. Tente novamente.', 'assertive')
    } finally {
      inFlight.current = false
    }
  }

  const onConfirm = () => {
    if (inFlight.current || !quote || !selectedWallet || stale) return
    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      setStale(['A cotação expirou.'])
      return
    }
    const values = form.getValues()
    const payload: CreateOrderInput = {
      quoteId: quote.id,
      quoteHash: quote.hash,
      walletId: selectedWallet.id,
      network: values.network,
      collector: {
        displayName: values.displayName,
        username: values.username,
        email: values.email,
        profileName: values.profileName,
        walletAddress: values.walletAddress,
        secondaryAddress: values.secondaryAddress,
        walletType: values.walletType,
        referralCode: values.referralCode,
        ensName: values.ensName,
        ensSuffix: values.ensSuffix,
      },
      note: values.note,
    }
    setSubmitError(undefined)
    setChangedNotice(null)
    void send(attemptFor(userId, payload))
  }

  // Recover an attempt that was sent but never answered (refresh, timeout, reconnect).
  useEffect(() => {
    const attempt = readAttempt(userId) as (CheckoutAttempt & { sentAt?: number }) | null
    if (!attempt || attempt.orderId || !attempt.sentAt || Date.now() - attempt.createdAt > RECOVERY_WINDOW_MS) return
    setSubmitState('recovering')
    announce('Recuperando sua tentativa de compra…')
    void send(attempt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onConnect = () => {
    if (!selectedWallet) return
    setWalletError(undefined)
    connect.mutate(
      { walletId: selectedWallet.id, network: form.getValues('network') },
      {
        onSuccess: () => announce(`${walletTypeLabels[selectedWallet.walletType]} conectada.`),
        onError: (error) => {
          setWalletError(errorMessage(error))
          announce(errorMessage(error), 'assertive')
        },
      },
    )
  }

  const onDisconnect = () => {
    if (!selectedWallet) return
    disconnect.mutate(selectedWallet.id, {
      onSuccess: () => {
        announce('Carteira desconectada.')
        if (step === 'review') setStep('form')
      },
      onError: (error) => toast.error(errorMessage(error)),
    })
  }

  /* ---------- Render ---------- */

  if (submitState === 'recovering') {
    return (
      <div className="container-page py-24 text-center" role="status">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-base font-bold">Recuperando sua compra…</p>
        <p className="mt-2 text-sm text-muted-foreground">Estamos verificando se o seu pedido já foi registrado.</p>
      </div>
    )
  }

  if (cart.isError && !cart.data) {
    return (
      <div className="container-page py-16">
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
      </div>
    )
  }

  if (cart.data && cart.data.items.length === 0) {
    const attempt = readAttempt(userId)
    return (
      <div className="container-page py-16">
        <EmptyState
          title="Não há itens para pagar"
          description="Seu carrinho está vazio. Adicione NFTs para continuar."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              {attempt?.orderId ? (
                <Link to="/pedido/$orderId" params={{ orderId: attempt.orderId }} className={buttonVariants({ variant: 'outline' })}>
                  Ver último pedido
                </Link>
              ) : null}
              <Link to="/mercado" className={buttonVariants()}>
                Explorar o mercado
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  const summaryQuote = step === 'review' ? quote ?? undefined : liveQuote.data
  const lines =
    step === 'review' && quote
      ? quote.lines.map((line) => ({ ...line, total: line.lineTotalEth, key: `${line.nftId}-${line.editionId}` }))
      : (cart.data?.items ?? []).map((item) => ({
          ...item,
          total:
            liveQuote.data?.lines.find((line) => line.nftId === item.nftId && line.editionId === item.editionId)
              ?.lineTotalEth ?? multiplyMoney(item.unitPriceEth, item.quantity),
          key: item.id,
        }))
  const blockingIssues = (summaryQuote?.issues ?? []).filter(
    (issue) => issue.type === 'UNAVAILABLE' || issue.type === 'INSUFFICIENT_QUANTITY',
  )
  const busy = submitState === 'sending' || submitState === 'retrying'
  const values = form.getValues()

  const collectorFields = (
    <>
            <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
              <FormField label="Nome de exibição" required error={errors.displayName?.message}>
                {(props) => <Input {...props} autoComplete="name" {...form.register('displayName')} />}
              </FormField>
              <FormField label="Nome de usuário" required error={errors.username?.message}>
                {(props) => <Input {...props} autoComplete="username" {...form.register('username')} />}
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
              <FormField label="Nome do perfil" required error={errors.profileName?.message}>
                {(props) => <Input {...props} {...form.register('profileName')} />}
              </FormField>
              <FormField label="Endereço da carteira" required error={errors.walletAddress?.message}>
                {(props) => (
                  <Input
                    {...props}
                    placeholder="Endereço 0x da carteira"
                    readOnly={!useOtherWallet && Boolean(selectedWallet)}
                    className={cn(!useOtherWallet && selectedWallet && 'text-subtle')}
                    {...form.register('walletAddress')}
                  />
                )}
              </FormField>
              <FormField label="ENS ou carteira secundária (opcional)" hideLabel error={errors.secondaryAddress?.message} className="md:pt-7">
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
              <FormField label="Código de indicação" required error={errors.referralCode?.message} hint="Ex.: KURIO2026">
                {(props) => <Input {...props} className="uppercase" {...form.register('referralCode')} />}
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
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="use-other-wallet"
                checked={useOtherWallet}
                onCheckedChange={(checked) => {
                  setUseOtherWallet(checked === true)
                  if (checked !== true && selectedWallet) fillFromWallet(selectedWallet, false)
                }}
                className="rounded-full"
              />
              <label htmlFor="use-other-wallet" className="text-[15px]">
                Usar outra carteira?
                <span className="block text-xs text-subtle">Receber os NFTs em outro endereço, pagando com a carteira selecionada.</span>
              </label>
            </div>

            <FormField label="Observação do colecionador (opcional)" error={errors.note?.message} className="max-w-[420px]">
              {(props) => <Textarea {...props} rows={6} className="min-h-[180px] rounded-sm" {...form.register('note')} />}
            </FormField>
    </>
  )

  const reviewDetails = (
            <dl className="grid gap-4 rounded-sm bg-card p-5 text-sm sm:grid-cols-2">
              {(
                [
                  ['Nome de exibição', values.displayName],
                  ['Nome de usuário', values.username],
                  ['E-mail', values.email],
                  ['Nome do perfil', values.profileName],
                  ['Rede', networkLabels[values.network]],
                  ['Tipo de carteira', walletTypeLabels[values.walletType]],
                  ['Endereço de recebimento', shortAddress(values.walletAddress)],
                  ['Nome ENS', `${values.ensName}${values.ensSuffix}`],
                  ['Código de indicação', values.referralCode],
                  ['Observação', values.note || '—'],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-subtle">{label}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
            </dl>
  )

  const walletType = form.watch('walletType')

  if (!isDesktop) {
    const providerIcon: Record<WalletType, React.ReactNode> = {
      walletconnect: <span className="text-sm font-bold text-primary">W</span>,
      metamask: <span className="text-sm font-bold text-primary">M</span>,
      coinbase: <WalletIcon className="size-5 text-primary" aria-hidden />,
    }
    return (
      <div className="flex min-h-svh flex-col">
        <MobileTopBar title="Pagamento com carteira" fallback="/carrinho" />
        <div className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-36">
          <CartNotices />
          {stale ? (
            <InlineAlert
              tone="warning"
              action={
                <Button size="sm" onClick={() => void goToReview(quote)} disabled={quoteMutation.isPending}>
                  {quoteMutation.isPending ? 'Atualizando…' : 'Atualizar revisão'}
                </Button>
              }
            >
              Os valores mudaram desde a sua revisão ({stale.join('; ')}). Atualize para ver o novo total antes de confirmar.
            </InlineAlert>
          ) : null}
          {changedNotice ? (
            <InlineAlert tone="warning">
              Valores atualizados: {changedNotice.join('; ')}. Confira o novo total e confirme novamente.
            </InlineAlert>
          ) : null}
          {submitError ? <InlineAlert tone="error">{submitError}</InlineAlert> : null}
          {blockingIssues.length ? (
            <InlineAlert
              tone="error"
              action={
                <Link to="/carrinho" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  Ajustar carrinho
                </Link>
              }
            >
              {blockingIssues.map((issue) => issue.message).join(' ')}
            </InlineAlert>
          ) : null}

          {step === 'form' ? (
            <>
              <section aria-labelledby="connected-title" className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="connected-title" className="text-sm font-bold">
                    Carteira conectada
                  </h2>
                  <Link to="/perfil/carteiras" className="text-xs font-bold text-primary">
                    Trocar carteira
                  </Link>
                </div>
                {wallets.isPending ? (
                  <div className="skeleton h-20 w-full rounded-2xl" aria-hidden />
                ) : registered.length === 0 ? (
                  <InlineAlert
                    tone="info"
                    action={
                      <Link to="/perfil/carteiras" className={buttonVariants({ size: 'sm' })}>
                        Cadastrar carteira
                      </Link>
                    }
                  >
                    Você ainda não tem carteiras cadastradas. Cadastre uma para pagar.
                  </InlineAlert>
                ) : (
                  <RadioGroup
                    value={selectedWallet?.id ?? ''}
                    onValueChange={(id) => {
                      setWalletId(id)
                      setWalletError(undefined)
                      const wallet = registered.find((item) => item.id === id)
                      if (wallet) fillFromWallet(wallet, useOtherWallet)
                    }}
                    aria-label="Carteira de pagamento"
                    className="grid-cols-[minmax(0,1fr)] gap-3"
                  >
                    {registered.map((wallet) => {
                      const status = wallets.data?.connections[wallet.id] ?? 'disconnected'
                      const selected = wallet.id === selectedWallet?.id
                      const ens = wallet.secondaryAddress.endsWith('.eth') || wallet.secondaryAddress.endsWith('.xyz')
                      return (
                        <div
                          key={wallet.id}
                          className={cn(
                            'flex items-center gap-4 rounded-2xl bg-card py-3 pr-2 pl-4',
                            selected && 'ring-1 ring-primary/60',
                          )}
                        >
                          <RadioGroupItem id={`wallet-${wallet.id}`} value={wallet.id} />
                          <label htmlFor={`wallet-${wallet.id}`} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
                            <span className="truncate text-sm font-bold">{wallet.nickname}</span>
                            <span className="truncate font-mono text-xs text-muted-foreground">
                              {ens ? wallet.secondaryAddress : shortAddress(wallet.address)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Rede {networkLabels[wallet.network]} ·{' '}
                              <span className={status === 'connected' ? 'text-success' : 'text-subtle'}>
                                {status === 'connected' ? 'Conectada' : 'Desconectada'}
                              </span>
                            </span>
                          </label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-primary hover:bg-secondary"
                                aria-label={`Opções da carteira ${wallet.nickname}`}
                              >
                                <MoreVertical className="size-5" aria-hidden />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {selected ? (
                                status === 'connected' ? (
                                  <DropdownMenuItem onSelect={onDisconnect}>Desconectar</DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onSelect={onConnect}>Conectar</DropdownMenuItem>
                                )
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setWalletId(wallet.id)
                                    fillFromWallet(wallet, useOtherWallet)
                                  }}
                                >
                                  Usar esta carteira
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link to="/perfil/carteiras">Editar carteiras</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )
                    })}
                  </RadioGroup>
                )}
              </section>

              <section aria-labelledby="provider-title" className="flex flex-col gap-3">
                <h2 id="provider-title" className="text-sm font-bold">
                  Carteira e rede
                </h2>
                <RadioGroup
                  value={walletType}
                  onValueChange={(value) => form.setValue('walletType', value as WalletType, { shouldDirty: true, shouldValidate: true })}
                  aria-label="Aplicativo de carteira"
                  className="grid-cols-[minmax(0,1fr)] gap-3"
                >
                  {(['walletconnect', 'metamask', 'coinbase'] as const).map((type) => (
                    <label
                      key={type}
                      htmlFor={`provider-${type}`}
                      className="flex cursor-pointer items-center gap-4 rounded-2xl bg-card px-4 py-3"
                    >
                      <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-full bg-secondary">
                        {providerIcon[type]}
                      </span>
                      <span className="flex-1 text-sm">{walletTypeLabels[type]}</span>
                      <RadioGroupItem id={`provider-${type}`} value={type} />
                    </label>
                  ))}
                </RadioGroup>
              </section>

              {walletError ? (
                <p role="alert" className="text-sm text-destructive">
                  {walletError}
                </p>
              ) : null}

              <details
                open={collectorOpen}
                onToggle={(event) => setCollectorOpen((event.currentTarget as HTMLDetailsElement).open)}
                className="group rounded-2xl bg-card px-4 py-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
                  Dados do colecionador
                  <span className="text-xs font-normal text-primary group-open:hidden">Editar</span>
                </summary>
                <form id="collector-form" onSubmit={onContinue} noValidate aria-label="Perfil do colecionador" className="mt-4 flex flex-col gap-5">
                  {collectorFields}
                </form>
              </details>

              <p className="flex items-baseline justify-end gap-6 text-base font-bold">
                <span>Total:</span>
                {summaryQuote ? (
                  <span className="text-primary tabular-nums" data-testid="summary-total">
                    {formatEth(summaryQuote.totalEth)}
                  </span>
                ) : (
                  <span className="skeleton inline-block h-5 w-24" aria-hidden />
                )}
              </p>
            </>
          ) : (
            <section aria-labelledby="review-title" className="flex flex-col gap-4">
              <h2 id="review-title" ref={reviewHeading} tabIndex={-1} className="text-base font-bold outline-none">
                Revise seu pedido
              </h2>
              <ul className="flex flex-col gap-2">
                {lines.map((line) => (
                  <LineItem key={line.key} line={line} />
                ))}
              </ul>
              <SummaryRows quote={summaryQuote} loading={!summaryQuote} updating={quoteMutation.isPending} className="rounded-2xl bg-card p-4" />
              <p className="text-sm">
                Pagando com <strong>{selectedWallet ? `${walletTypeLabels[walletType]} · ${selectedWallet.nickname}` : '—'}</strong>
                {connection === 'connected' ? <span className="text-success"> · conectada</span> : null}
              </p>
              {reviewDetails}
              <Button variant="outline" onClick={() => setStep('form')} disabled={busy}>
                Voltar e editar dados
              </Button>
            </section>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 bg-background/95 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
          {submitState === 'retrying' ? (
            <p role="status" className="mb-2 text-center text-xs text-subtle">
              Sem resposta ainda. Verificando seu pedido com a mesma chave, sem duplicar a compra…
            </p>
          ) : null}
          {step === 'form' ? (
            <button
              type="submit"
              form="collector-form"
              disabled={quoteMutation.isPending || connect.isPending || cart.isPending}
              className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {connect.isPending ? 'Conectando carteira…' : quoteMutation.isPending ? 'Revalidando valores…' : 'Confirmar compra'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || Boolean(stale) || blockingIssues.length > 0 || !quote || connection !== 'connected'}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Enviando pedido…
                </>
              ) : submitState === 'failed' ? (
                'Tentar novamente'
              ) : (
                `Confirmar compra · ${quote ? formatEth(quote.totalEth) : ''}`
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container-page flex flex-col gap-6 py-6">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/mercado' }, { label: 'Pagamento' }]} />
      <h1 className="sr-only">Pagamento</h1>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_490px]">
        {/* ---------- Left: collector profile or review ---------- */}
        {step === 'form' ? (
          <form id="collector-form" onSubmit={onContinue} noValidate aria-labelledby="collector-title" className="flex flex-col gap-6">
            <h2 id="collector-title" className="text-lg font-bold tracking-wide">
              Perfil do colecionador
            </h2>
            {submitError ? <InlineAlert tone="error">{submitError}</InlineAlert> : null}
            {collectorFields}
          </form>
        ) : (
          <section aria-labelledby="review-title" className="flex flex-col gap-6">
            <h2 id="review-title" ref={reviewHeading} tabIndex={-1} className="text-lg font-bold tracking-wide outline-none">
              Revise seu pedido
            </h2>
            <p className="text-sm text-muted-foreground">
              Confira os dados abaixo. Os valores foram revalidados agora e serão verificados de novo ao confirmar.
            </p>
            {reviewDetails}
            <div>
              <Button variant="outline" onClick={() => setStep('form')} disabled={busy}>
                Voltar e editar dados
              </Button>
            </div>
          </section>
        )}

        {/* ---------- Right: items, totals, wallet ---------- */}
        <aside aria-labelledby="your-nfts" className="flex flex-col gap-4 self-start">
          <h2 id="your-nfts" className="text-lg font-bold tracking-wide">
            Seus NFTs
          </h2>
          <div className="flex justify-between border-b border-border pb-2 text-base font-bold" aria-hidden>
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          <CartNotices />
          {cart.isPending ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="skeleton h-16 w-full" />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {lines.map((line) => (
                <LineItem key={line.key} line={line} />
              ))}
            </ul>
          )}
          <p className="text-center text-sm">
            Tem um código promocional?{' '}
            <Link to="/carrinho" className="text-primary hover:underline">
              Aplique aqui
            </Link>
          </p>

          {stale ? (
            <InlineAlert
              tone="warning"
              action={
                <Button size="sm" onClick={() => void goToReview(quote)} disabled={quoteMutation.isPending}>
                  {quoteMutation.isPending ? 'Atualizando…' : 'Atualizar revisão'}
                </Button>
              }
            >
              Os valores mudaram desde a sua revisão ({stale.join('; ')}). Atualize para ver o novo total antes de confirmar.
            </InlineAlert>
          ) : null}
          {changedNotice ? (
            <InlineAlert tone="warning">
              Valores atualizados: {changedNotice.join('; ')}. Confira o novo total e confirme novamente.
            </InlineAlert>
          ) : null}

          <SummaryRows
            quote={summaryQuote}
            loading={!summaryQuote}
            updating={step === 'form' ? liveQuote.isFetching : quoteMutation.isPending}
            className="border-b border-border pb-4"
          />
          {blockingIssues.length ? (
            <InlineAlert
              tone="error"
              action={
                <Link to="/carrinho" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  Ajustar carrinho
                </Link>
              }
            >
              {blockingIssues.map((issue) => issue.message).join(' ')}
            </InlineAlert>
          ) : null}

          <section aria-labelledby="wallet-title" className="flex flex-col gap-3">
            <h3 id="wallet-title" className="text-center text-lg font-bold">
              Carteira e rede
            </h3>
            <div className="flex items-center gap-3 rounded-sm border border-border px-4 py-3">
              <WalletBadges />
              <span className="text-xs text-subtle">Carteiras compatíveis</span>
            </div>
            {wallets.isPending ? (
              <div className="skeleton h-14 w-full" aria-hidden />
            ) : registered.length === 0 ? (
              <InlineAlert
                tone="info"
                action={
                  <Link to="/perfil/carteiras" className={buttonVariants({ size: 'sm' })}>
                    Cadastrar carteira
                  </Link>
                }
              >
                Você ainda não tem carteiras cadastradas. Cadastre uma para pagar.
              </InlineAlert>
            ) : (
              <RadioGroup
                value={selectedWallet?.id ?? ''}
                onValueChange={(id) => {
                  setWalletId(id)
                  setWalletError(undefined)
                  const wallet = registered.find((item) => item.id === id)
                  if (wallet) fillFromWallet(wallet, useOtherWallet)
                  if (step === 'review') setStep('form')
                }}
                aria-label="Carteira de pagamento"
                className="grid-cols-[minmax(0,1fr)] gap-3"
              >
                {registered.map((wallet) => {
                  const status = wallets.data?.connections[wallet.id] ?? 'disconnected'
                  const selected = wallet.id === selectedWallet?.id
                  return (
                    <label
                      key={wallet.id}
                      htmlFor={`wallet-${wallet.id}`}
                      className={cn(
                        'flex cursor-pointer items-center gap-4 rounded-sm border px-4 py-3',
                        selected ? 'border-primary' : 'border-border hover:border-primary/60',
                      )}
                    >
                      <RadioGroupItem id={`wallet-${wallet.id}`} value={wallet.id} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-base">
                          {walletTypeLabels[wallet.walletType]}{' '}
                          <span className="text-xs text-subtle">· {wallet.slot === 'primary' ? 'principal' : 'secundária'}</span>
                        </span>
                        <span className="truncate text-xs text-subtle">
                          {wallet.nickname} · {shortAddress(wallet.address)} · {networkLabels[wallet.network]}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs',
                          status === 'connected' ? 'text-success' : 'text-subtle',
                        )}
                      >
                        {status === 'connected' ? <CheckCircle2 className="size-3.5" aria-hidden /> : null}
                        {status === 'connected' ? 'Conectada' : 'Desconectada'}
                      </span>
                    </label>
                  )
                })}
              </RadioGroup>
            )}

            {selectedWallet ? (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span role="status">
                  {connection === 'connected'
                    ? `${walletTypeLabels[selectedWallet.walletType]} conectada em ${networkLabels[network]}.`
                    : 'Conecte a carteira para autorizar o pagamento.'}
                </span>
                {connection === 'connected' ? (
                  <Button size="sm" variant="outline" onClick={onDisconnect} disabled={disconnect.isPending || busy}>
                    <Unplug aria-hidden /> Desconectar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={onConnect} disabled={connect.isPending}>
                    <PlugZap aria-hidden /> {connect.isPending ? 'Aguardando aprovação…' : 'Conectar carteira'}
                  </Button>
                )}
              </div>
            ) : null}
            {walletError ? (
              <p role="alert" className="text-sm text-destructive">
                {walletError}
              </p>
            ) : null}
          </section>

          {submitError && step === 'review' ? <InlineAlert tone="error">{submitError}</InlineAlert> : null}
          {submitState === 'retrying' ? (
            <p role="status" className="text-center text-sm text-subtle">
              Sem resposta ainda. Verificando seu pedido com a mesma chave, sem duplicar a compra…
            </p>
          ) : null}

          {step === 'form' ? (
            <Button
              type="submit"
              form="collector-form"
              size="lg"
              className="h-12 text-base"
              disabled={quoteMutation.isPending || connect.isPending || cart.isPending}
            >
              {connect.isPending
                ? 'Conectando carteira…'
                : quoteMutation.isPending
                  ? 'Revalidando valores…'
                  : 'Confirmar compra'}
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-12 text-base"
              onClick={onConfirm}
              disabled={busy || Boolean(stale) || blockingIssues.length > 0 || !quote || connection !== 'connected'}
              aria-describedby="confirm-hint"
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden /> Enviando pedido…
                </>
              ) : submitState === 'failed' ? (
                'Tentar novamente'
              ) : (
                `Confirmar compra · ${quote ? formatEth(quote.totalEth) : ''}`
              )}
            </Button>
          )}
          <p id="confirm-hint" className="text-center text-xs text-subtle">
            {step === 'form'
              ? 'Se a carteira estiver desconectada, pediremos a conexão. Você revisará o pedido antes do envio.'
              : 'Ao confirmar, a carteira simulada autoriza o pagamento na rede.'}
          </p>
        </aside>
      </div>
    </div>
  )
}
