/**
 * localStorage/sessionStorage access that never throws (private mode, quota,
 * disabled storage). Callers must render correctly when values are missing.
 */
type Area = 'local' | 'session'

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readStorage<T>(key: string, kind: Area = 'local'): T | null {
  try {
    const raw = area(kind)?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: unknown, kind: Area = 'local'): void {
  try {
    area(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: state just won't survive a refresh */
  }
}

export function removeStorage(key: string, kind: Area = 'local'): void {
  try {
    area(kind)?.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const storageKeys = {
  token: 'kurio:token',
  guestCartId: 'kurio:guest-cart-id',
  checkoutDraft: 'kurio:checkout-draft',
  checkoutAttempt: 'kurio:checkout-attempt',
  pendingSignup: 'kurio:pending-signup',
} as const
