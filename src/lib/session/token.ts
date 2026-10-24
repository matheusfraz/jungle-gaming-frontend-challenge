import { randomId } from '@/lib/id'
import { readStorage, removeStorage, storageKeys, writeStorage } from '@/lib/storage'

/**
 * The bearer token is the only session secret the browser keeps. It is
 * persisted so the session can be recovered after a refresh; the server
 * decides whether it is still valid (GET /auth/session).
 */
let token: string | null = readStorage<string>(storageKeys.token)

export function getToken(): string | null {
  return token
}

export function setToken(next: string | null): void {
  token = next
  if (next) writeStorage(storageKeys.token, next)
  else removeStorage(storageKeys.token)
}

/** Visitors get a stable cart id so the cart survives refreshes and can be merged on login. */
export function getGuestCartId(): string {
  let id = readStorage<string>(storageKeys.guestCartId)
  if (!id) {
    id = randomId('guest_')
    writeStorage(storageKeys.guestCartId, id)
  }
  return id
}

export function rotateGuestCartId(): void {
  writeStorage(storageKeys.guestCartId, randomId('guest_'))
}

type SessionListener = (reason: 'expired' | 'unauthorized') => void
const listeners = new Set<SessionListener>()

/** Fired by the HTTP layer when the API rejects the current token. */
export function onSessionInvalid(listener: SessionListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitSessionInvalid(reason: 'expired' | 'unauthorized'): void {
  listeners.forEach((listener) => listener(reason))
}
