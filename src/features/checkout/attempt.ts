import type { CreateOrderInput } from '@/contracts/commerce'
import { randomId } from '@/lib/id'
import { readStorage, removeStorage, storageKeys, writeStorage } from '@/lib/storage'

/**
 * A purchase attempt = one idempotency key bound to one exact payload.
 * It is persisted in sessionStorage so a refresh, timeout or reconnect can
 * resend the *same* request and recover the same order instead of creating
 * a second one. A different payload (new quote, other wallet) gets a new key.
 */
export interface CheckoutAttempt {
  key: string
  userId: string
  payload: CreateOrderInput
  payloadHash: string
  orderId?: string
  createdAt: number
}

const hashPayload = (payload: CreateOrderInput) => JSON.stringify(payload)

export function readAttempt(userId: string): CheckoutAttempt | null {
  const attempt = readStorage<CheckoutAttempt>(storageKeys.checkoutAttempt, 'session')
  return attempt && attempt.userId === userId ? attempt : null
}

export function attemptFor(userId: string, payload: CreateOrderInput): CheckoutAttempt {
  const existing = readAttempt(userId)
  const payloadHash = hashPayload(payload)
  if (existing && existing.payloadHash === payloadHash && !existing.orderId) return existing
  const attempt: CheckoutAttempt = {
    key: randomId('idem_'),
    userId,
    payload,
    payloadHash,
    createdAt: Date.now(),
  }
  writeStorage(storageKeys.checkoutAttempt, attempt, 'session')
  return attempt
}

export function markAttemptDone(attempt: CheckoutAttempt, orderId: string) {
  writeStorage(storageKeys.checkoutAttempt, { ...attempt, orderId }, 'session')
}

export function clearAttempt() {
  removeStorage(storageKeys.checkoutAttempt, 'session')
}
