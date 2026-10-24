import {
  authResponseSchema,
  pendingSignupSchema,
  type VerifySignupInput,
  sessionSchema,
  type LoginInput,
  type RegisterInput,
  type Session,
} from '@/contracts/account'
import { cartSchema } from '@/contracts/commerce'
import { httpClient, isApiError, request } from '@/lib/http/client'
import { getToken, setToken } from '@/lib/session/token'

export function login(input: LoginInput) {
  return request(authResponseSchema, { method: 'POST', url: '/auth/login', data: input })
}

/** Step 1: sends a confirmation code to the e-mail (the account does not exist yet). */
export function register(input: RegisterInput) {
  return request(pendingSignupSchema, { method: 'POST', url: '/auth/register', data: input })
}

/** Step 2: confirms the code, creates the account and opens the session. */
export function verifySignup(input: VerifySignupInput) {
  return request(authResponseSchema, { method: 'POST', url: '/auth/register/verify', data: input })
}

export function resendSignupCode(verificationId: string) {
  return request(pendingSignupSchema, { method: 'POST', url: '/auth/register/resend', data: { verificationId } })
}

export async function logout(): Promise<void> {
  try {
    await httpClient.post('/auth/logout')
  } catch {
    /* logging out locally is enough if the server is unreachable */
  }
}

/** Resolves the current session from the stored token; null for visitors. */
export async function fetchSession(signal?: AbortSignal): Promise<Session | null> {
  if (!getToken()) return null
  try {
    return await request(sessionSchema, { url: '/auth/session', signal })
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      setToken(null)
      return null
    }
    throw error
  }
}

export function mergeGuestCart(guestCartId: string) {
  return request(cartSchema, { method: 'POST', url: '/cart/merge', data: { guestCartId } })
}
