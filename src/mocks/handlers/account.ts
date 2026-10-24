import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
  avatarInputSchema,
  passwordChangeInputSchema,
  profileInputSchema,
  walletInputSchema,
  walletSlotSchema,
  type Profile,
  type Wallet,
} from '@/contracts/account'
import { networkIdSchema } from '@/contracts/nft'
import { randomId } from '@/lib/id'
import type { UserRecord } from '../fixtures/users'
import { db, getScenario, hashPassword, saveDb } from '../db'
import { API, apiError, readJson, requireUser, validationError, withNetwork, zodFieldErrors } from '../http'

function toProfile(user: UserRecord): Profile {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    ensSuffix: user.ensSuffix,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
  }
}

function walletBook(userId: string) {
  return (db.wallets[userId] ??= { primary: null, secondary: null, secondarySameAsPrimary: false })
}

function walletsResponse(userId: string) {
  const book = walletBook(userId)
  const connections: Record<string, 'connected' | 'disconnected'> = {}
  for (const wallet of [book.primary, book.secondary]) {
    if (wallet) connections[wallet.id] = db.walletConnections[wallet.id] ?? 'disconnected'
  }
  return { ...book, connections }
}

export const accountHandlers = [
  /* ---------- Profile ---------- */
  http.get(
    `${API}/profile`,
    withNetwork(({ request }) => HttpResponse.json(toProfile(requireUser(request)))),
  ),

  http.patch(
    `${API}/profile`,
    withNetwork(async ({ request }) => {
      const user = requireUser(request)
      const parsed = profileInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const others = Object.values(db.users).filter((entry) => entry.id !== user.id)
      const fieldErrors: Record<string, string> = {}
      if (others.some((entry) => entry.username === parsed.data.username))
        fieldErrors.username = 'Este nome de usuário já está em uso.'
      if (others.some((entry) => entry.email.toLowerCase() === parsed.data.email.toLowerCase()))
        fieldErrors.email = 'Este e-mail já pertence a outra conta.'
      if (Object.keys(fieldErrors).length) return apiError(409, 'CONFLICT', 'Alguns dados já estão em uso.', { fieldErrors })
      Object.assign(user, parsed.data, { email: parsed.data.email.toLowerCase(), updatedAt: new Date().toISOString() })
      saveDb()
      return HttpResponse.json(toProfile(user))
    }),
  ),

  http.post(
    `${API}/profile/avatar`,
    withNetwork(async ({ request }) => {
      const user = requireUser(request)
      const parsed = avatarInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues), 'Imagem inválida.')
      user.avatarUrl = parsed.data.dataUrl
      user.updatedAt = new Date().toISOString()
      saveDb()
      return HttpResponse.json(toProfile(user))
    }),
  ),

  http.delete(
    `${API}/profile/avatar`,
    withNetwork(({ request }) => {
      const user = requireUser(request)
      user.avatarUrl = null
      user.updatedAt = new Date().toISOString()
      saveDb()
      return HttpResponse.json(toProfile(user))
    }),
  ),

  http.post(
    `${API}/profile/password`,
    withNetwork(async ({ request }) => {
      const user = requireUser(request)
      const parsed = passwordChangeInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const current = await hashPassword(user.salt, parsed.data.currentPassword)
      if (current !== user.passwordHash)
        return validationError({ currentPassword: 'A senha atual está incorreta.' }, 'A senha atual está incorreta.')
      user.salt = randomId('salt_')
      user.passwordHash = await hashPassword(user.salt, parsed.data.newPassword)
      user.updatedAt = new Date().toISOString()
      saveDb()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  /* ---------- Wallets ---------- */
  http.get(
    `${API}/wallets`,
    withNetwork(({ request }) => HttpResponse.json(walletsResponse(requireUser(request).id))),
  ),

  http.put(
    `${API}/wallets/:slot`,
    withNetwork(async ({ request, params }) => {
      const user = requireUser(request)
      const slot = walletSlotSchema.safeParse(params.slot)
      if (!slot.success) return apiError(404, 'NOT_FOUND', 'Tipo de carteira inexistente.')
      const parsed = walletInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const book = walletBook(user.id)
      const other = slot.data === 'primary' ? book.secondary : book.primary
      const fieldErrors: Record<string, string> = {}
      if (other && other.address.toLowerCase() === parsed.data.address.toLowerCase() && !book.secondarySameAsPrimary)
        fieldErrors.address = `Este endereço já está cadastrado como carteira ${slot.data === 'primary' ? 'secundária' : 'principal'}.`
      if (!parsed.data.referralCode.startsWith('KURIO'))
        fieldErrors.referralCode = 'Código de indicação não encontrado. Use um código que comece com KURIO.'
      if (Object.keys(fieldErrors).length) return validationError(fieldErrors)

      const current = book[slot.data]
      const wallet: Wallet = {
        ...parsed.data,
        id: current?.id ?? randomId(`wal_${slot.data}_`),
        slot: slot.data,
        updatedAt: new Date().toISOString(),
      }
      book[slot.data] = wallet
      if (slot.data === 'secondary') book.secondarySameAsPrimary = false
      if (current && current.address !== wallet.address) db.walletConnections[wallet.id] = 'disconnected'
      saveDb()
      return HttpResponse.json(walletsResponse(user.id))
    }),
  ),

  http.post(
    `${API}/wallets/secondary/same-as-primary`,
    withNetwork(async ({ request }) => {
      const user = requireUser(request)
      const parsed = z.object({ enabled: z.boolean() }).safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const book = walletBook(user.id)
      if (parsed.data.enabled && !book.primary)
        return apiError(422, 'VALIDATION_ERROR', 'Cadastre a carteira principal primeiro.')
      book.secondarySameAsPrimary = parsed.data.enabled
      saveDb()
      return HttpResponse.json(walletsResponse(user.id))
    }),
  ),

  http.post(
    `${API}/wallets/:walletId/connect`,
    withNetwork(async ({ request, params }) => {
      const user = requireUser(request)
      const parsed = z.object({ network: networkIdSchema }).safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const book = walletBook(user.id)
      const wallet = [book.primary, book.secondary].find((entry) => entry?.id === params.walletId)
      if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      if (getScenario() === 'wallet-rejected')
        return apiError(403, 'WALLET_REJECTED', 'A conexão foi recusada na carteira. Aprove a solicitação para continuar.')
      db.walletConnections[wallet.id] = 'connected'
      saveDb()
      return HttpResponse.json({ walletId: wallet.id, status: 'connected', network: parsed.data.network, address: wallet.address })
    }),
  ),

  http.post(
    `${API}/wallets/:walletId/disconnect`,
    withNetwork(({ request, params }) => {
      const user = requireUser(request)
      const book = walletBook(user.id)
      const wallet = [book.primary, book.secondary].find((entry) => entry?.id === params.walletId)
      if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      db.walletConnections[wallet.id] = 'disconnected'
      saveDb()
      return HttpResponse.json({ walletId: wallet.id, status: 'disconnected', network: wallet.network, address: wallet.address })
    }),
  ),
]
