/**
 * Resolve API URLs for the browser.
 *
 * In development the SPA talks to the Nitro dev server's `/api` proxy, which
 * forwards requests to the real backend. In the static production build there
 * is no Node/Nitro server running, so the SPA must call the backend directly
 * on the same origin — e.g. `/backend/api` (set via NUXT_PUBLIC_API_BASE).
 */
export const useApiBase = (): string => {
  const config = useRuntimeConfig()
  return ((config.public.apiBase as string) || '/api').replace(/\/+$/, '')
}

/**
 * Convert an internal endpoint path (always written with the `/api` prefix)
 * into the correct URL using the configured browser API base.
 *
 *   apiUrl('/api/members', '/api')          -> '/api/members'
 *   apiUrl('/api/members', '/backend/api')  -> '/backend/api/members'
 */
export const apiUrl = (path: string, base: string): string => {
  // Pass through already-absolute URLs untouched.
  if (/^https?:\/\//i.test(path)) return path

  const clean = path.startsWith('/') ? path : `/${path}`
  const withoutApiPrefix = clean.replace(/^\/api(?=\/|$)/, '')
  return `${base}${withoutApiPrefix}`
}
