import { http, HttpResponse } from 'msw'
import {
  loginInputSchema,
  registerInputSchema,
  resendSignupInputSchema,
  verifySignupInputSchema,
  type PendingSignup,
  type Session,
} from '@/contracts/account'
import { randomId } from '@/lib/id'
import type { UserRecord } from '../fixtures/users'
import { db, getScenario, hashPassword, type PendingSignupRecord, saveDb, sendMail } from '../db'
import { API, apiError, optionalUser, readJson, tokenFrom, validationError, withNetwork, zodFieldErrors } from '../http'

const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const SHORT_SESSION_TTL_MS = 20 * 1000
const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000
const MAX_CODE_ATTEMPTS = 5

function accountConflicts(username: string, email: string) {
  const users = Object.values(db.users)
  const fieldErrors: Record<string, string> = {}
  if (users.some((user) => user.email.toLowerCase() === email.toLowerCase()))
    fieldErrors.email = 'Este e-mail já está cadastrado.'
  if (users.some((user) => user.username === username)) fieldErrors.username = 'Este nome de usuário já está em uso.'
  return Object.keys(fieldErrors).length
    ? apiError(409, 'CONFLICT', 'Já existe uma conta com esses dados.', { fieldErrors })
    : null
}

function randomCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(value).padStart(6, '0')
}

/** Generates a new code (stored only as a hash) and "e-mails" it. */
async function issueCode(pending: PendingSignupRecord) {
  const code = randomCode()
  pending.codeHash = await hashPassword(pending.id, code)
  pending.attempts = 0
  pending.expiresAt = Date.now() + CODE_TTL_MS
  pending.resendAvailableAt = Date.now() + RESEND_COOLDOWN_MS
  sendMail({ to: pending.email, subject: 'Seu código de confirmação Kurio', code })
}

function toPendingSignup(pending: PendingSignupRecord): PendingSignup {
  return {
    verificationId: pending.id,
    email: pending.email,
    expiresAt: new Date(pending.expiresAt).toISOString(),
    resendAvailableAt: new Date(pending.resendAvailableAt).toISOString(),
  }
}

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
  /*
   * Sign-up is two-step: the account only exists after the user proves they
   * own the e-mail by typing the 6-digit code "sent" to it (simulated inbox).
   */
  http.post(
    `${API}/auth/register`,
    withNetwork(async ({ request }) => {
      const parsed = registerInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const { username, email, password } = parsed.data
      const conflict = accountConflicts(username, email)
      if (conflict) return conflict

      // A new attempt for the same e-mail replaces the previous pending one.
      for (const [id, pending] of Object.entries(db.pendingSignups)) {
        if (pending.email === email.toLowerCase()) delete db.pendingSignups[id]
      }
      const salt = randomId('salt_')
      const pending: PendingSignupRecord = {
        id: randomId('ver_'),
        username,
        email: email.toLowerCase(),
        salt,
        passwordHash: await hashPassword(salt, password),
        codeHash: '',
        attempts: 0,
        expiresAt: 0,
        resendAvailableAt: 0,
      }
      await issueCode(pending)
      db.pendingSignups[pending.id] = pending
      saveDb()
      return HttpResponse.json(toPendingSignup(pending), { status: 202 })
    }),
  ),

  http.post(
    `${API}/auth/register/verify`,
    withNetwork(async ({ request }) => {
      const parsed = verifySignupInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const pending = db.pendingSignups[parsed.data.verificationId]
      if (!pending) return apiError(404, 'NOT_FOUND', 'Cadastro não encontrado. Preencha o formulário novamente.')
      if (pending.expiresAt <= Date.now()) {
        const message = 'O código expirou. Peça um novo código.'
        return apiError(422, 'CODE_EXPIRED', message, { fieldErrors: { code: message } })
      }
      if (pending.attempts >= MAX_CODE_ATTEMPTS) {
        const message = 'Muitas tentativas. Peça um novo código.'
        return apiError(422, 'CODE_EXPIRED', message, { fieldErrors: { code: message } })
      }
      if ((await hashPassword(pending.id, parsed.data.code)) !== pending.codeHash) {
        pending.attempts += 1
        saveDb()
        const left = MAX_CODE_ATTEMPTS - pending.attempts
        const message =
          left > 0 ? `Código incorreto. Você tem mais ${left} tentativa(s).` : 'Muitas tentativas. Peça um novo código.'
        return apiError(422, left > 0 ? 'CODE_INVALID' : 'CODE_EXPIRED', message, { fieldErrors: { code: message } })
      }

      // Someone may have taken the e-mail/username while this was pending.
      const conflict = accountConflicts(pending.username, pending.email)
      if (conflict) {
        delete db.pendingSignups[pending.id]
        saveDb()
        return conflict
      }
      const user: UserRecord = {
        id: randomId('usr_'),
        email: pending.email,
        username: pending.username,
        displayName: pending.username,
        avatarUrl: null,
        salt: pending.salt,
        passwordHash: pending.passwordHash,
        ensName: pending.username.replace(/_/g, '-'),
        ensSuffix: '.eth',
        walletNickname: 'Minha carteira',
        updatedAt: new Date().toISOString(),
      }
      db.users[user.id] = user
      db.favorites[user.id] = []
      db.wallets[user.id] = { primary: null, secondary: null, secondarySameAsPrimary: false }
      delete db.pendingSignups[pending.id]
      saveDb()
      return HttpResponse.json(issueSession(user), { status: 201 })
    }),
  ),

  http.post(
    `${API}/auth/register/resend`,
    withNetwork(async ({ request }) => {
      const parsed = resendSignupInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(zodFieldErrors(parsed.error.issues))
      const pending = db.pendingSignups[parsed.data.verificationId]
      if (!pending) return apiError(404, 'NOT_FOUND', 'Cadastro não encontrado. Preencha o formulário novamente.')
      const wait = Math.ceil((pending.resendAvailableAt - Date.now()) / 1000)
      if (wait > 0)
        return apiError(429, 'RATE_LIMITED', `Aguarde ${wait} s para pedir um novo código.`, {
          details: { retryAfterSeconds: wait },
        })
      await issueCode(pending)
      saveDb()
      return HttpResponse.json(toPendingSignup(pending))
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
