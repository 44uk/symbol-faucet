const {
  Account,
  NetworkType
} = require('nem2-sdk')

const API_URL = process.env.NEM_API_URL || 'http://localhost:3000'
const PUBLIC_URL = process.env.NEM_PUBLIC_URL || API_URL
const NETWORK = process.env.NEM_NETWORK
const GENERATION_HASH = process.env.NEM_GENERATION_HASH
const MOSAIC_FQN = process.env.NEM_MOSAIC_FQN
const MOSAIC_HEX = process.env.NEM_MOSAIC_HEX
const MOSAIC_ID = MOSAIC_FQN || MOSAIC_HEX || 'cat.currency'
const OUT_MIN = parseInt(process.env.NEM_OUT_MIN || 100000000)
const OUT_MAX = parseInt(process.env.NEM_OUT_MAX || 500000000)
const OUT_OPT = parseInt(process.env.NEM_OUT_OPT || parseInt((OUT_MAX + OUT_MIN) / 2))
const MAX_FEE = parseInt(process.env.NEM_MAX_FEE || 0)
const MAX_TRANSACTION_DEADLINE = parseInt(process.env.NEM_MAX_TRANSACTION_DEADLINE || 1439)
const ENOUGH_BALANCE = parseInt(process.env.NEM_ENOUGH_BALANCE || '100000000000')
const WAIT_HEIGHT = parseInt(process.env.NEM_WAIT_HEIGHT || '0')
const MAX_UNCONFIRMED = parseInt(process.env.NEM_MAX_UNCONFIRMED || '99')
const RECAPTCHA_ENABLED = !!process.env.RECAPTCHA_CLIENT_SECRET && !!process.env.RECAPTCHA_SERVER_SECRET
const RECAPTCHA_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify'
const RECAPTCHA_CLIENT_SECRET = process.env.RECAPTCHA_CLIENT_SECRET || undefined
const RECAPTCHA_SERVER_SECRET = process.env.RECAPTCHA_SERVER_SECRET || undefined

const FAUCET_ACCOUNT = Account.createFromPrivateKey(
  process.env.NEM_PRIVATE_KEY,
  NetworkType[process.env.NEM_NETWORK]
)

const config = {
  FAUCET_ACCOUNT,
  API_URL,
  PUBLIC_URL,
  NETWORK,
  GENERATION_HASH,
  MOSAIC_FQN,
  MOSAIC_HEX,
  MOSAIC_ID,
  OUT_MIN,
  OUT_MAX,
  OUT_OPT,
  MAX_FEE,
  MAX_TRANSACTION_DEADLINE,
  ENOUGH_BALANCE,
  WAIT_HEIGHT,
  MAX_UNCONFIRMED,
  RECAPTCHA_ENABLED,
  RECAPTCHA_ENDPOINT,
  RECAPTCHA_CLIENT_SECRET,
  RECAPTCHA_SERVER_SECRET
}

console.debug('Config: %o', config)

module.exports = {
  config
}
