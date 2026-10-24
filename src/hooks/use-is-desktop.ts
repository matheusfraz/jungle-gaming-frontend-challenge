import { useSyncExternalStore } from 'react'

/** Desktop layout from 768px (Tailwind `md`); below it the mobile frames apply. */
const QUERY = '(min-width: 768px)'

function subscribe(listener: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

const getSnapshot = () => window.matchMedia(QUERY).matches

/**
 * Used where the mobile and desktop frames differ in structure (not just in
 * spacing), so only one version is in the DOM: no duplicated ids, forms or
 * queries.
 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
