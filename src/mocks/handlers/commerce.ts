import { http, HttpResponse } from 'msw'
import {
  addCartItemInputSchema,
  couponInputSchema,
  mergeCartInputSchema,
  newsletterInputSchema,
  quoteRequestSchema,
  updateCartItemInputSchema,
} from '@/contracts/commerce'
import { randomId } from '@/lib/id'
import {
  buildQuote,
  cartOwnerFor,
  checkCoupon,
  db,
  getCartRecord,
  getScenario,
  saveDb,
  toCart,
  touchCart,
} from '../db'
import {
  API,
  apiError,
  cartOwnerOf,
  readJson,
  requireUser,
  validationError,
  withNetwork,
  zodFieldErrors,
} from '../http'

function limitFor(nftId: string, editionId: string) {
  const nft = db.nfts[nftId]
  if (!nft) throw apiError(404, 'NOT_FOUND', 'Este NFT não existe ou foi removido.')
  const edition = nft.editions.find((entry) => entry.id === editionId)
  if (!edition) throw apiError(404, 'NOT_FOUND', 'Edição não encontrada.')
  return { nft, edition, max: Math.min(edition.available, edition.maxPerOrder) }
}

export const favoriteHandlers = [
  http.get(
    `${API}/favorites`,
    withNetwork(({ request }) => {
      const user = requireUser(request)
      return HttpResponse.json({ nftIds: db.favorites[user.id] ?? [] })
    }),
  ),
  http.put(
    `${API}/favorites/:nftId`,
    withNetwork(({ request, params }) => {
      const user = requireUser(request)
      if (getScenario() === 'favorite-failure') return apiError(500, 'TRANSIENT', 'Não foi possível salvar o favorito.')
      const nftId = String(params.nftId)
      if (!db.nfts[nftId]) return apiError(404, 'NOT_FOUND', 'Este NFT não existe.')
      const list = (db.favorites[user.id] ??= [])
      if (!list.includes(nftId)) list.push(nftId)
      saveDb()
      return HttpResponse.json({ nftIds: list })
    }),
  ),
  http.delete(
    `${API}/favorites/:nftId`,
    withNetwork(({ request, params }) => {
      const user = requireUser(request)
      if (getScenario() === 'favorite-failure') return apiError(500, 'TRANSIENT', 'Não foi possível remover o favorito.')
      db.favorites[user.id] = (db.favorites[user.id] ?? []).filter((id) => id !== String(params.nftId))
      saveDb()
      return HttpResponse.json({ nftIds: db.favorites[user.id] })
    }),
  ),
]

export const cartHandlers = [
  http.get(
    `${API}/cart`,
    withNetwork(({ request }) => HttpResponse.json(toCart(cartOwnerOf(request)))),
  ),

  http.post(
    `${API}/cart/items`,
    withNetwork(async ({ request }) => {
      const owner = cartOwnerOf(request)
      const parsed = addCartItemInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const { nftId, editionId, quantity } = parsed.data
      const { nft, edition, max } = limitFor(nftId, editionId)
      const cart = getCartRecord(owner)
      const existing = cart.items.find((item) => item.nftId === nftId && item.editionId === editionId)
      const nextQuantity = (existing?.quantity ?? 0) + quantity
      if (edition.available === 0)
        return apiError(409, 'AVAILABILITY_CONFLICT', `A edição ${edition.label} de ${nft.name} está esgotada.`, {
          details: { maxQuantity: 0 },
        })
      if (nextQuantity > max)
        return apiError(
          409,
          'AVAILABILITY_CONFLICT',
          `Você pode ter no máximo ${max} unidade(s) da edição ${edition.label} no carrinho.`,
          { details: { maxQuantity: max } },
        )
      if (existing) existing.quantity = nextQuantity
      else cart.items.push({ id: randomId('line_'), nftId, editionId, quantity })
      touchCart(cart)
      return HttpResponse.json(toCart(owner), { status: 201 })
    }),
  ),

  http.patch(
    `${API}/cart/items/:lineId`,
    withNetwork(async ({ request, params }) => {
      const owner = cartOwnerOf(request)
      const parsed = updateCartItemInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const cart = getCartRecord(owner)
      const item = cart.items.find((entry) => entry.id === String(params.lineId))
      if (!item) return apiError(404, 'NOT_FOUND', 'Este item não está mais no carrinho.')
      const { edition, max } = limitFor(item.nftId, item.editionId)
      if (parsed.data.quantity > max)
        return apiError(
          409,
          'AVAILABILITY_CONFLICT',
          max === 0
            ? `A edição ${edition.label} esgotou.`
            : `Apenas ${max} unidade(s) disponível(is) para a edição ${edition.label}.`,
          { details: { maxQuantity: max } },
        )
      item.quantity = parsed.data.quantity
      touchCart(cart)
      return HttpResponse.json(toCart(owner))
    }),
  ),

  http.delete(
    `${API}/cart/items/:lineId`,
    withNetwork(({ request, params }) => {
      const owner = cartOwnerOf(request)
      const cart = getCartRecord(owner)
      const before = cart.items.length
      cart.items = cart.items.filter((entry) => entry.id !== String(params.lineId))
      if (cart.items.length === before) return apiError(404, 'NOT_FOUND', 'Este item não está mais no carrinho.')
      if (cart.items.length === 0) cart.couponCode = null
      touchCart(cart)
      return HttpResponse.json(toCart(owner))
    }),
  ),

  http.post(
    `${API}/cart/coupon`,
    withNetwork(async ({ request }) => {
      const owner = cartOwnerOf(request)
      const parsed = couponInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const check = checkCoupon(parsed.data.code)
      if (!check.ok) {
        const message =
          check.code === 'COUPON_EXPIRED' ? 'Este cupom expirou.' : 'Cupom inválido. Confira o código e tente novamente.'
        return apiError(422, check.code, message, { fieldErrors: { code: message } })
      }
      const cart = getCartRecord(owner)
      if (cart.items.length === 0) return apiError(422, 'VALIDATION_ERROR', 'Adicione itens antes de aplicar um cupom.')
      cart.couponCode = parsed.data.code.trim().toUpperCase()
      touchCart(cart)
      return HttpResponse.json(toCart(owner))
    }),
  ),

  http.delete(
    `${API}/cart/coupon`,
    withNetwork(({ request }) => {
      const owner = cartOwnerOf(request)
      const cart = getCartRecord(owner)
      cart.couponCode = null
      touchCart(cart)
      return HttpResponse.json(toCart(owner))
    }),
  ),

  http.post(
    `${API}/cart/merge`,
    withNetwork(async ({ request }) => {
      const user = requireUser(request)
      const parsed = mergeCartInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const guestOwner = cartOwnerFor(null, parsed.data.guestCartId)
      const userOwner = cartOwnerFor(user.id, null)
      const guest = db.carts[guestOwner]
      const target = getCartRecord(userOwner)
      if (guest && guest.items.length) {
        for (const item of guest.items) {
          const nft = db.nfts[item.nftId]
          const edition = nft?.editions.find((entry) => entry.id === item.editionId)
          if (!nft || !edition) continue
          const max = Math.min(edition.available, edition.maxPerOrder)
          const existing = target.items.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId)
          const merged = Math.min(max, (existing?.quantity ?? 0) + item.quantity)
          if (merged <= 0) continue
          if (existing) existing.quantity = merged
          else target.items.push({ ...item, id: randomId('line_'), quantity: merged })
        }
        target.couponCode ??= guest.couponCode
        delete db.carts[guestOwner]
        touchCart(target)
      }
      return HttpResponse.json(toCart(userOwner))
    }),
  ),

  http.post(
    `${API}/quotes`,
    withNetwork(async ({ request }) => {
      const owner = cartOwnerOf(request)
      const parsed = quoteRequestSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const { items, couponCode, network } = parsed.data
      return HttpResponse.json(buildQuote(owner, items, couponCode, network))
    }),
  ),

  http.post(
    `${API}/newsletter`,
    withNetwork(async ({ request }) => {
      const parsed = newsletterInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const email = parsed.data.email.toLowerCase()
      if (db.newsletter.includes(email))
        return apiError(409, 'CONFLICT', 'Este e-mail já recebe nossos lançamentos.', {
          fieldErrors: { email: 'Este e-mail já recebe nossos lançamentos.' },
        })
      db.newsletter.push(email)
      saveDb()
      return HttpResponse.json({ subscribed: true }, { status: 201 })
    }),
  ),
]
