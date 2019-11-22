import express from 'express'
import consola from 'consola'
import bodyParser from 'body-parser'
const { Nuxt, Builder } = require('nuxt')
const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

require('dotenv').config({ path: '.env' })

// Import and Set Nuxt.js options
import config from '../nuxt.config';
config.dev = !(process.env.NODE_ENV === 'production')

import monitor from './monitor'
import bootstrap from './bootstrap'
import faucetHandler from './handlers/faucet'
import claimsHandler from './handlers/claims'

process.on('unhandledRejection', console.dir)

async function start() {
  // Init Nuxt.js
  const nuxt = new Nuxt(config)
  const { host, port } = nuxt.options.server

  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  } else {
    await nuxt.ready()
  }

  const appConfig = await bootstrap.init()

  app.get('/', faucetHandler(appConfig))
  app.post('/claims', claimsHandler(appConfig))

  // Give nuxt middleware to express
  app.use(nuxt.render)

  // Listen the server
  app.listen(port, host)
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })

  const { API_URL, FAUCET_ACCOUNT } = appConfig
  monitor(API_URL, FAUCET_ACCOUNT.address)
}
start()
