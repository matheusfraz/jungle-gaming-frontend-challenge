/**
 * Build-time environment. Kept dependency-free because it is part of the tiny
 * entry chunk (see main.tsx).
 */
function readBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  throw new Error(`Invalid boolean environment value: ${String(value)}`)
}

const apiUrl = String(import.meta.env.VITE_API_URL ?? '/api').trim() || '/api'

export const env = {
  enableMocks: readBoolean(import.meta.env.VITE_ENABLE_MOCKS, false),
  apiUrl,
}
