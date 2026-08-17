// Browser-facing API base: what the SPA calls from the browser.
// - Local dev:  /api            (the Nitro dev server proxies /api/** to the backend)
// - Production: /backend/api    (static cPanel build, no Node server — call backend directly)
const browserApiBase = process.env.NUXT_PUBLIC_API_BASE || '/api'

// Server-side proxy target: the real backend URL. Used only by the Nitro
// dev/preview server (server/api/[...].ts and nitro.routeRules).
const backendTarget = process.env.NUXT_API_BASE || 'http://192.168.100.100/amms/public/api'
const backendBase = backendTarget.replace(/\/api\/?$/, '')

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
      apiBase: browserApiBase
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
