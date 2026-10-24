import { delay, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { ApiErrorCode } from '@/contracts/common'
import type { UserRecord } from './fixtures/users'
import { cartOwnerFor, db, getScenario, saveDb } from './db'
import { createRandom } from './scenarios'

export const API = `${import.meta.env.VITE_API_URL ?? '/api'}`.replace(/\/$/, '')

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fieldErrors?: Record<string, string>; details?: unknown } = {},
) {
  return HttpResponse.json({ code, message, ...extra }, { status })
}

export function validationError(fieldErrors: Record<string, string>, message = 'Revise os campos destacados.') {
  return apiError(422, 'VALIDATION_ERROR', message, { fieldErrors })
}

/** Converts a zod error into `{ field: message }`. */
export function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form'
    result[key] ??= issue.message
  }
  return result
}

/* ---------- Network simulation ---------- */

let random = createRandom(42)
let catalogRequestCount = 0
const flakySeen = new Set<string>()

export function resetNetworkState(): void {
  random = createRandom(42)
  catalogRequestCount = 0
  flakySeen.clear()
}

type Kind = 'catalog' | 'default'

async function simulateNetwork(request: Request, kind: Kind): Promise<Response | undefined> {
  const scenario = getScenario()

  if (scenario === 'offline') {
    await delay(150)
    return HttpResponse.error()
  }

  switch (scenario) {
    case 'instant':
      break
    case 'slow':
      await delay(2500)
      break
    case 'variable-latency':
      await delay(100 + Math.round(random() * 1900))
      break
    case 'out-of-order':
      if (kind === 'catalog') {
        catalogRequestCount += 1
        await delay(catalogRequestCount % 2 === 1 ? 1600 : 150)
      } else {
        await delay(120)
      }
      break
    default:
      await delay(120 + Math.round(random() * 230))
  }

  if (scenario === 'server-error' && kind === 'catalog') {
    return apiError(500, 'TRANSIENT', 'O catálogo está indisponível no momento.')
  }

  if (scenario === 'flaky' && request.method === 'GET') {
    const key = new URL(request.url).pathname + new URL(request.url).search
    if (!flakySeen.has(key)) {
      flakySeen.add(key)
      return apiError(503, 'TRANSIENT', 'Serviço temporariamente indisponível.')
    }
  }
  return undefined
}

/**
 * Wraps a resolver with the active network scenario (latency, offline,
 * transient failures) and lets resolvers `throw` a Response to short-circuit.
 */
export function withNetwork<Params extends PathParams, Body extends DefaultBodyType>(
  resolver: HttpResponseResolver<Params, Body>,
  kind: Kind = 'default',
): HttpResponseResolver<Params, Body> {
  return async (info) => {
    const simulated = await simulateNetwork(info.request, kind)
    if (simulated) return simulated
    try {
      return await resolver(info)
    } catch (error) {
      if (error instanceof Response) return error
      console.error('[mocks] handler crashed', error)
      return apiError(500, 'INTERNAL', 'Erro interno do servidor simulado.')
    }
  }
}

/* ---------- Auth helpers ---------- */

export function tokenFrom(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

/** Returns the user for a valid token, or null for visitors. Throws 401 for bad/expired tokens. */
export function optionalUser(request: Request): UserRecord | null {
  const token = tokenFrom(request)
  if (!token) return null
  const session = db.sessions[token]
  if (!session) throw apiError(401, 'UNAUTHORIZED', 'Sessão inválida. Entre novamente.')
  if (session.expiresAt <= Date.now()) {
    delete db.sessions[token]
    saveDb()
    throw apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  const user = db.users[session.userId]
  if (!user) throw apiError(401, 'UNAUTHORIZED', 'Sessão inválida. Entre novamente.')
  return user
}

export function requireUser(request: Request): UserRecord {
  const user = optionalUser(request)
  if (!user) throw apiError(401, 'UNAUTHORIZED', 'Entre na sua conta para continuar.')
  return user
}

export function cartOwnerOf(request: Request): string {
  const user = optionalUser(request)
  return cartOwnerFor(user?.id ?? null, request.headers.get('X-Guest-Cart'))
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw apiError(400, 'VALIDATION_ERROR', 'Corpo da requisição inválido.')
  }
}
