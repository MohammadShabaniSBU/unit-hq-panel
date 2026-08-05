// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'Keevaris Portal',
      titleTemplate: 'Keevaris Portal'
    }
  }, 
  ssr: false,

  runtimeConfig: {
    public: {
      apiBaseUrl: '',
      reverbAppKey: '',
      reverbHost: '',
      reverbPort: '',
      reverbScheme: ''
    }
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@bubblesortt/nuxt-es-toolkit',
    '@nuxtjs/i18n',
    '@pinia/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { redirect: '/leasing/contacts' },
    '/marketing/automations': { redirect: '/automations' },
    '/marketing/automations/**': { redirect: '/automations/**' },
    '/marketing/email-builder': { redirect: '/marketing/templates/email' },
    '/marketing/email-builder/**': { redirect: '/marketing/templates/email/**' },
    '/settings/stripe-connect': { redirect: '/settings/payments' },
    '/settings/billing-rules': { redirect: '/settings/late-fees-liens' },
    '/facility/sites': { redirect: '/settings/facility/sites' },
    '/facility/sites/**': { redirect: '/settings/facility/sites/**' }
  },

  i18n: {
    restructureDir: '.',
    defaultLocale: 'en',
    strategy: 'no_prefix',
    langDir: 'locales',
    locales: [
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
      { code: 'es', language: 'es-ES', file: 'es.json', name: 'Español' },
      { code: 'fr', language: 'fr-FR', file: 'fr.json', name: 'Français' }
    ]
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})