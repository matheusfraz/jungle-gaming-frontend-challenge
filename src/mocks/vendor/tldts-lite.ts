/**
 * Minimal stand-in for `tldts`, aliased only in mock builds (see vite.config.ts).
 *
 * MSW keeps a cookie jar through `tough-cookie`, which imports `getDomain` from
 * `tldts` — a ~100 KB public-suffix database. This app never uses cookies, so
 * a naive "last two labels" implementation is enough and keeps the demo bundle
 * small. Never use it outside the mock layer.
 */
export function getDomain(hostname: string): string | null {
  if (!hostname || /^[\d.]+$/.test(hostname) || hostname.includes(':')) return null
  const labels = hostname.toLowerCase().split('.').filter(Boolean)
  if (labels.length < 2) return null
  return labels.slice(-2).join('.')
}

export default { getDomain }
