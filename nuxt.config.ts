// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    [
      '@nuxtjs/google-fonts',
      {
        families: {
          'Open Sans': [100, 200, 300, 400, 500, 600, 700, 800, 900],
          'Fira Code': [100, 200, 300, 400, 500, 600, 700, 800, 900]
        }
      }
    ]
  ],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8080/api/agent'
    }
  }
})
