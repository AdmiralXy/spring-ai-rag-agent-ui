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
          'Noto Sans': [100, 200, 300, 400, 500, 600, 700, 800, 900],
          'Fira Code': [100, 200, 300, 400, 500, 600, 700, 800, 900]
        }
      }
    ]
  ],
  css: ['~/assets/css/main.css'],
  icon: {
    provider: 'server',
    serverBundle: 'local',
    fallbackToApi: false,
    clientBundle: {
      scan: true
    }
  },
  runtimeConfig: {
    apiBase: 'http://localhost:8080/api/agent',
    public: {
      apiBase: 'http://localhost:8080/api/agent',
      spaceUploadProviders: '',
      repositoryUrl:
        import.meta.env.NUXT_PUBLIC_REPOSITORY_URL ||
        'https://github.com/AdmiralXy/spring-ai-rag-agent',
      buildNumber: import.meta.env.NUXT_PUBLIC_BUILD_NUMBER || 'local',
      buildDate: import.meta.env.NUXT_PUBLIC_BUILD_DATE || ''
    }
  }
})
