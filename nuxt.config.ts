// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
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

