// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt',],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: 'https://club-management-api.onrender.com'
    }
  },
})
