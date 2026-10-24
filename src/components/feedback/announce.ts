/**
 * Global screen-reader announcer. Mutations and realtime changes call
 * `announce()`; <LiveRegion /> renders the regions once in the root layout.
 */
type Politeness = 'polite' | 'assertive'
export let announcerState = { polite: '', assertive: '', tick: 0 }
const listeners = new Set<() => void>()

export function announce(message: string, politeness: Politeness = 'polite') {
  // Clearing first makes repeated identical messages be read again.
  announcerState = { ...announcerState, [politeness]: '', tick: announcerState.tick + 1 }
  listeners.forEach((listener) => listener())
  window.setTimeout(() => {
    announcerState = { ...announcerState, [politeness]: message }
    listeners.forEach((listener) => listener())
  }, 60)
}

export function subscribeAnnouncer(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
