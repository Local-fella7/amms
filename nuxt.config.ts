const isDev = process.env.NODE_ENV !== 'production'

const rawBrowserBase = process.env.NUXT_PUBLIC_API_BASE || '/api'
let backendTarget = process.env.NUXT_API_BASE

// If NUXT_PUBLIC_API_BASE is an absolute URL (e.g. https://asa.or.tz/backend/api)
// but NUXT_API_BASE is not set, adopt it as the backend target.
if (!backendTarget && /^https?:\/\//i.test(rawBrowserBase)) {
  backendTarget = rawBrowserBase
}
backendTarget = (backendTarget || 'https://asa.or.tz/backend/api').replace(/\/+$/, '')
if (!backendTarget.endsWith('/api')) {
  backendTarget = `${backendTarget}/api`
}
const backendBase = backendTarget.replace(/\/api\/?$/, '')

// In local development, if browser base is an external origin (like https://...),
// browser CORS policies will block requests from localhost. Route through local /api proxy instead.
const browserApiBase = (isDev && /^https?:\/\//i.test(rawBrowserBase))
  ? '/api'
  : rawBrowserBase.replace(/\/+$/, '')

// In production, default browser-facing backend URL to relative '/backend' to match same-origin static deployment
const browserBackendUrl = isDev
  ? backendBase
  : (backendBase.startsWith('http') ? backendBase.replace(/^https?:\/\/[^/]+/, '') || '/backend' : backendBase)

const routeRules: Record<string, { proxy: string }> = {
  '/uploads/**': {
    proxy: `${backendBase}/uploads/**`
  }
}

// Only add a proxy route when the browser base is a same-origin path (not a full URL).
if (browserApiBase.startsWith('/')) {
  routeRules[`${browserApiBase}/**`] = {
    proxy: `${backendTarget}/**`
  }
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // Server-only: the real backend URL used by the dev/preview proxy.
    apiBase: backendTarget,
    public: {
      // Exposed to the client: used to build API URLs in the browser.
      apiBase: browserApiBase,
      backendUrl: browserBackendUrl
    }
  },
  nitro: {
    routeRules
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/google-fonts',
    'notivue/nuxt'
  ],
  css: [
    'bootstrap/dist/css/bootstrap.min.css',
    'bootstrap-icons/font/bootstrap-icons.css',
    'notivue/notification.css',
    'notivue/animations.css',
    '~/assets/css/main.css'
  ]
})
