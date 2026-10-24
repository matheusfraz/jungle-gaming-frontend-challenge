import { useSyncExternalStore } from 'react'

/**
 * Price/availability changes received while the user has items in the cart.
 * Shown on the cart and checkout screens until dismissed.
 */
export interface CartNotice {
  id: string
  nftId: string
  message: string
}

let notices: CartNotice[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export const cartNotices = {
  push(notice: CartNotice) {
    notices = [...notices.filter((item) => item.id !== notice.id), notice].slice(-6)
    emit()
  },
  dismiss(id: string) {
    notices = notices.filter((item) => item.id !== id)
    emit()
  },
  clear() {
    notices = []
    emit()
  },
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCartNotices() {
  return useSyncExternalStore(subscribe, () => notices, () => notices)
}
