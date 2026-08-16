const apiBase = process.env.NUXT_PUBLIC_API_BASE || 'http://192.168.100.100/amms/public/api'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase
    }
  },
  nitro: {
    routeRules: {
      '/api/**': {
        proxy: `${apiBase}/**`
      }
    }
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




