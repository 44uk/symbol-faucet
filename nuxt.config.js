const pkg = require('./package')

const recaptchaPlugin =
  process.env.RECAPTCHA_CLIENT_SECRET && process.env.RECAPTCHA_SERVER_SECRET
    ? ['@nuxtjs/recaptcha']
    : []

module.exports = {
  mode: 'universal',

  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 4000
  },

  /*
   ** Headers of the page
   */
  head: {
    title: pkg.name,
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: pkg.description }
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
  },

  /*
   ** Customize the progress-bar color
   */
  loading: { color: '#fff' },

  /*
   ** Global CSS
   */
  css: ['assets/stylesheets/overwrite.styl'],

  /*
   ** Plugins to load before mounting the App
   */
  plugins: [{ src: '~plugins/vuex-persistedstate', ssr: false }],

  /*
   ** Nuxt.js modules
   */
  modules: ['@nuxtjs/axios', 'nuxt-buefy'].concat(recaptchaPlugin),

  /*
   ** Axios module configuration
   */
  axios: {
    baseURL: '/',
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 4000
  },

  recaptcha: {
    siteKey: process.env.RECAPTCHA_CLIENT_SECRET,
    version: 3,
    hideBadge: false
  },

  /*
   ** Build configuration
   */
  build: {
    extend(config, ctx) {
      config.node = {
        fs: 'empty'
      }
      if (ctx.isDev && ctx.isClient) {
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/
        })
      }
    }
  }
}
