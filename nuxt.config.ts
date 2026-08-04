// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://192.168.100.100/amms/public/api'
    }
  },
  nitro: {
    routeRules: {
      '/api/**': {
        proxy: 'http://192.168.100.100/amms/public/api/**'
      }
    }
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/google-fonts'
  ],
  css: [
    'bootstrap/dist/css/bootstrap.min.css',
    'bootstrap-icons/font/bootstrap-icons.css',
    '~/assets/css/main.css'
  ]
})



