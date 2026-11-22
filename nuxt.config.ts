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
          Inter: [400, 500, 600, 700],
          'JetBrains Mono': [400, 500]
        },
        display: 'swap'
      }
    ]
  ],
  css: ['~/assets/css/main.css', '~/assets/css/space-providers.css'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'color-scheme', content: 'dark' }
      ]
    }
  },
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
