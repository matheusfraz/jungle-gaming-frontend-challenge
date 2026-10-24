import { http, HttpResponse } from 'msw'
import { loginInputSchema, registerInputSchema, type Session } from '@/contracts/account'
import { randomId } from '@/lib/id'
import type { UserRecord } from '../fixtures/users'
import { db, getScenario, hashPassword, saveDb } from '../db'
import { API, apiError, optionalUser, readJson, tokenFrom, validationError, withNetwork, zodFieldErrors } from '../http'

const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const SHORT_SESSION_TTL_MS = 20 * 1000

function toSession(user: UserRecord, expiresAt: number): Session {
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    expiresAt: new Date(expiresAt).toISOString(),
  }
}

function issueSession(user: UserRecord) {
  const token = randomId('tok_')
  const ttl = getScenario() === 'session-expired' ? SHORT_SESSION_TTL_MS : SESSION_TTL_MS
  const expiresAt = Date.now() + ttl
  db.sessions[token] = { userId: user.id, expiresAt }
  saveDb()
  return { token, session: toSession(user, expiresAt) }
}

export const authHandlers = [
  http.post(
    `${API}/auth/register`,
    withNetwork(async ({ request }) => {
      const parsed = registerInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const { username, email, password } = parsed.data
      const users = Object.values(db.users)
      const fieldErrors: Record<string, string> = {}
      if (users.some((user) => user.email.toLowerCase() === email.toLowerCase()))
        fieldErrors.email = 'Este e-mail já está cadastrado.'
      if (users.some((user) => user.username === username)) fieldErrors.username = 'Este nome de usuário já está em uso.'
      if (Object.keys(fieldErrors).length)
        return apiError(409, 'CONFLICT', 'Já existe uma conta com esses dados.', { fieldErrors })

      const salt = randomId('salt_')
      const user: UserRecord = {
        id: randomId('usr_'),
        email: email.toLowerCase(),
        username,
        displayName: username,
        avatarUrl: null,
        salt,
        passwordHash: await hashPassword(salt, password),
        ensName: username.replace(/_/g, '-'),
        ensSuffix: '.eth',
        walletNickname: 'Minha carteira',
        updatedAt: new Date().toISOString(),
      }
      db.users[user.id] = user
      db.favorites[user.id] = []
      db.wallets[user.id] = { primary: null, secondary: null, secondarySameAsPrimary: false }
      saveDb()
      return HttpResponse.json(issueSession(user), { status: 201 })
    }),
  ),

  http.post(
    `${API}/auth/login`,
    withNetwork(async ({ request }) => {
      const parsed = loginInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const user = Object.values(db.users).find(
        (entry) => entry.email.toLowerCase() === parsed.data.email.toLowerCase(),
      )
      const valid = user && (await hashPassword(user.salt, parsed.data.password)) === user.passwordHash
      if (!user || !valid) return apiError(401, 'UNAUTHORIZED', 'E-mail ou senha incorretos.')
      return HttpResponse.json(issueSession(user))
    }),
  ),

  http.get(
    `${API}/auth/session`,
    withNetwork(({ request }) => {
      const user = optionalUser(request)
      if (!user) return apiError(401, 'UNAUTHORIZED', 'Nenhuma sessão ativa.')
      const token = tokenFrom(request)!
      return HttpResponse.json(toSession(user, db.sessions[token].expiresAt))
    }),
  ),

  http.post(
    `${API}/auth/logout`,
    withNetwork(({ request }) => {
      const token = tokenFrom(request)
      if (token) {
        delete db.sessions[token]
        saveDb()
      }
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
