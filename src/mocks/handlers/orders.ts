import { delay, http, HttpResponse } from 'msw'
import { collectorFormSchema } from '@/contracts/checkout'
import { createOrderInputSchema } from '@/contracts/commerce'
import { walletTypeLabels } from '@/contracts/account'
import {
  buildQuote,
  cartOwnerFor,
  consumeOnce,
  db,
  getScenario,
  ORDER_SETTLE_DELAY_MS,
  type OrderRecord,
  saveDb,
  scheduleSettlement,
  settleOrder,
  stableHash,
  toOrder,
  updateNft,
} from '../db'
import { API, apiError, readJson, requireUser, validationError, withNetwork, zodFieldErrors } from '../http'
import { addMoney } from '@/lib/money'

/** The client gives up after 6 s; the timeout scenario answers after this. */
const TIMEOUT_SCENARIO_DELAY_MS = 9000

export const orderHandlers = [
  http.post(
    `${API}/orders`,
    withNetwork(async ({ request }) => {
      const user = requireUser(request)
      const key = request.headers.get('Idempotency-Key')
      if (!key || key.length < 8) return apiError(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key ausente.')

      const parsed = createOrderInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const input = parsed.data
      const requestHash = stableHash(input)
      const scopedKey = `${user.id}:${key}`

      // Idempotency: same key + same payload => same order; different payload => conflict.
      const existingId = db.idempotency[scopedKey]
      if (existingId) {
        const existing = db.orders[existingId]
        if (existing.requestHash !== requestHash)
          return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outros dados.')
        if (existing.status === 'pending' && existing.settleAt <= Date.now()) settleOrder(existing.id)
        return HttpResponse.json(toOrder(db.orders[existingId]), { status: 200 })
      }

      const collector = collectorFormSchema.safeParse({
        ...input.collector,
        network: input.network,
        note: input.note,
      })
      if (!collector.success) return validationError(zodFieldErrors(collector.error.issues))

      const quote = db.quotes[input.quoteId]
      if (!quote || quote.owner !== cartOwnerFor(user.id, null))
        return apiError(409, 'QUOTE_STALE', 'A cotação expirou. Revise os valores antes de confirmar.')

      // Scenario side effects happen "on the server" between quote and order.
      const firstLine = quote.lines[0]
      if (getScenario() === 'checkout-price-change' && firstLine && consumeOnce('checkout-price-change')) {
        const nft = db.nfts[firstLine.nftId]
        updateNft(nft.id, { priceEth: addMoney(nft.priceEth, '0.05') })
      }
      if (getScenario() === 'checkout-sold-out' && firstLine && consumeOnce('checkout-sold-out')) {
        updateNft(firstLine.nftId, { editions: [{ id: firstLine.editionId, available: 0 }] })
      }

      const fresh = buildQuote(
        quote.owner,
        quote.lines.map((line) => ({ nftId: line.nftId, editionId: line.editionId, quantity: line.quantity })),
        quote.coupon?.code ?? null,
        input.network,
      )
      if (fresh.issues.some((issue) => issue.type === 'UNAVAILABLE' || issue.type === 'INSUFFICIENT_QUANTITY')) {
        return apiError(409, 'AVAILABILITY_CONFLICT', 'Um ou mais itens não estão mais disponíveis.', {
          details: { quote: fresh, changes: fresh.issues.map((issue) => issue.message) },
        })
      }
      if (fresh.hash !== input.quoteHash || new Date(quote.expiresAt).getTime() < Date.now()) {
        const changes = fresh.lines
          .map((line) => {
            const before = quote.lines.find((old) => old.nftId === line.nftId && old.editionId === line.editionId)
            return before && before.unitPriceEth !== line.unitPriceEth
              ? `${line.name}: ${before.unitPriceEth} ETH → ${line.unitPriceEth} ETH`
              : null
          })
          .filter((change): change is string => Boolean(change))
        return apiError(409, 'QUOTE_STALE', 'Os valores mudaram desde a sua revisão. Confirme novamente.', {
          details: { quote: fresh, changes: changes.length ? changes : ['Taxas ou cupom atualizados.'] },
        })
      }

      const walletBook = db.wallets[user.id]
      const wallet = [walletBook?.primary, walletBook?.secondary].find((entry) => entry?.id === input.walletId)
      if (!wallet) return apiError(422, 'VALIDATION_ERROR', 'Selecione uma carteira cadastrada.', {
        fieldErrors: { walletId: 'Selecione uma carteira cadastrada.' },
      })
      if (db.walletConnections[wallet.id] !== 'connected')
        return apiError(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira antes de confirmar a compra.')

      // Reserve the units while the payment is pending.
      for (const line of fresh.lines) {
        const nft = db.nfts[line.nftId]
        const edition = nft.editions.find((entry) => entry.id === line.editionId)!
        updateNft(nft.id, { editions: [{ id: edition.id, available: edition.available - line.quantity }] })
      }

      const now = Date.now()
      const order: OrderRecord = {
        id: `ord_${stableHash({ key: scopedKey }).slice(0, 12)}`,
        status: 'pending',
        version: 1,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        txHash: null,
        explorerUrl: null,
        rejectionReason: null,
        lines: fresh.lines,
        subtotalEth: fresh.subtotalEth,
        discountEth: fresh.discountEth,
        networkFeeEth: fresh.networkFeeEth,
        totalEth: fresh.totalEth,
        couponCode: fresh.coupon?.code ?? null,
        network: input.network,
        wallet: {
          id: wallet.id,
          type: wallet.walletType,
          address: wallet.address,
          label: walletTypeLabels[wallet.walletType],
        },
        userId: user.id,
        idempotencyKey: key,
        requestHash,
        settleAt: now + ORDER_SETTLE_DELAY_MS,
        outcome: getScenario() === 'payment-rejected' ? 'rejected' : 'confirmed',
        cartOwner: cartOwnerFor(user.id, null),
      }
      db.orders[order.id] = order
      db.idempotency[scopedKey] = order.id
      saveDb()
      scheduleSettlement(order)

      if (getScenario() === 'order-timeout' && consumeOnce('order-timeout')) {
        // The order exists, but the response arrives after the client timed out.
        await delay(TIMEOUT_SCENARIO_DELAY_MS)
      }
      return HttpResponse.json(toOrder(order), { status: 201 })
    }),
  ),

  http.get(
    `${API}/orders/:orderId`,
    withNetwork(({ request, params }) => {
      const user = requireUser(request)
      const order = db.orders[String(params.orderId)]
      if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
      if (order.userId !== user.id) return apiError(403, 'FORBIDDEN', 'Você não tem permissão para ver este pedido.')
      if (order.status === 'pending' && order.settleAt <= Date.now()) settleOrder(order.id)
      return HttpResponse.json(toOrder(db.orders[order.id]))
    }),
  ),
]
