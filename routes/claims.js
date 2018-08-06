const config = require('config')
const express = require('express')
const router = express.Router()

const request = require('request')
const nem = require('nem2-sdk')
const rx = require('rxjs')
const op = require('rxjs/operators')
const qs = require('querystring')
const _ = require('lodash')
_.mixin({ isBlank: val => { return _.isEmpty(val) && !_.isNumber(val) || _.isNaN(val) } })

const GOOGLE_RECAPTCHA_ENDPOINT = 'https://www.google.com/recaptcha/api/siteverify'
const GOOGLE_RECAPTCHA_ENABLED = !_.isBlank(process.env.RECAPTCHA_SERVER_SECRET);
const MAX_XEM = parseInt(process.env.MAX_XEM || config.maxXem)
const MIN_XEM = parseInt(process.env.MIN_XEM || config.minXem)
const ENOUGH_BALANCE = parseInt(process.env.ENOUGH_BALANCE || config.enoughBalance)
const MAX_UNCONFIRMED = parseInt(process.env.MAX_UNCONFIRMED || config.maxUnconfirmed)
const WAIT_HEIGHT = parseInt(process.env.WAIT_HEIGHT || config.waitHeight)
const API_URL = `${process.env.API_HOST}:${process.env.API_PORT}`

const faucetAccount = nem.Account.createFromPrivateKey(
  process.env.PRIVATE_KEY,
  nem.NetworkType[process.env.NETWORK]
)
const accountHttp = new nem.AccountHttp(API_URL)
const blockchainHttp = new nem.BlockchainHttp(API_URL)
const mosaicHttp = new nem.MosaicHttp(API_URL);
const namespaceHttp = new nem.NamespaceHttp(API_URL);
const mosaicService = new nem.MosaicService(accountHttp, mosaicHttp, namespaceHttp)
const transactionHttp = new nem.TransactionHttp(API_URL)

router.post('/', async (req, res, next) => {
  const address = req.body.address
  const message = req.body.message
  const encrypt = req.body.encrypt
  const mosaic  = req.body.mosaic
  const amount  = req.body.amount
  const reCaptcha = req.body['g-recaptcha-response']
  const reCaptchaUrl = reCaptchaValidationUrl(reCaptcha)
  const params = _.omitBy({
    address: address,
    message: message,
    encrypt: encrypt,
    mosaic:  mosaic,
    amount:  amount,
  }, _.isBlank)

  const query = qs.stringify(params)
  const sanitizedAddress = nem.Address.createFromRawAddress(address)

  if(GOOGLE_RECAPTCHA_ENABLED) {
    const reCaptchaRes = await requestReCaptchaValidation(reCaptchaUrl).catch(_ => false)
    if(!reCaptchaRes){
      req.flash('error', 'Failed ReCaptcha. Please try again.')
      res.redirect(`/?${query}`)
      return
    }
  }
  const currentHeight = await blockchainHttp.getBlockchainHeight().toPromise().catch(err => err)

  rx.forkJoin(
    [
      mosaicService.mosaicsAmountViewFromAddress(faucetAccount.address)
        .pipe(
          op.mergeMap(_ => _),
          op.filter(mo => mo.fullName() === 'nem:xem')
        ),
      mosaicService.mosaicsAmountViewFromAddress(sanitizedAddress)
        .pipe(
          op.mergeMap(_ => _),
          op.filter(mo => mo.fullName() === 'nem:xem')
        ),
      accountHttp.outgoingTransactions(faucetAccount)
        .pipe(
          op.mergeMap(_ => _),
          op.filter(tx => {
            return tx.recipient.address == sanitizedAddress.address &&
              currentHeight.compact() - tx.transactionInfo.height.compact() < WAIT_HEIGHT
          }),
          op.toArray()
        ),
      accountHttp.unconfirmedTransactions(faucetAccount)
        .pipe(
          op.mergeMap(_ => _),
          op.filter(tx => tx.recipient.address == sanitizedAddress.address),
          op.toArray()
        )
    ]
  )
    .subscribe(
      results => {
        const xemFaucetOwned = results[0]
        const xemClaimerOwned = results[1]
        const outgoings = results[2]
        const unconfirmed = results[3]

        if(unconfirmed.length > MAX_UNCONFIRMED) {
          console.debug(`unconfirmed length => %d`, unconfirmed.length)
          req.flash('error', `Too many unconfirmed claiming. Please wait for %d confirming.`, MAX_UNCONFIRMED)
          res.redirect(`/?${query}`)
          return
        }

        if(outgoings.length > 0) {
          console.debug(`outgoing length => %d`, outgoings.length)
          req.flash('error', `Too many claiming. Please wait %d more blocks confirmed.`, WAIT_HEIGHT)
          res.redirect(`/?${query}`)
          return
        }

        if(false && xemClaimerOwned.amount.compact() >= ENOUGH_BALANCE) {
          console.debug(`claimer balance => %d`, xemClaimerOwned.amount.compact())
          req.flash('error', `Your account already have enougth balance => (%s)`, xemClaimerOwned.relativeAmount())
          res.redirect(`/?${query}`)
          return
        }

        // determine amount to pay out
        const faucetBalance = xemFaucetOwned.amount.compact() - 1000000
        const txAmount = sanitizeAmount(amount) || Math.min(faucetBalance, randomInRange(MIN_XEM, MAX_XEM))
        console.debug(`faucet balance => %d`, faucetBalance)
        console.debug(`pay out amount => %d`, txAmount)

        let msg;
        if(false && message && encrypt) {
          console.debug('Encrypted message => %s', message)
          // nem2-sdk have not implemented EncryptMessage.
          // message = nem.EncryptedMessage.create(message)
        } else if (message) {
          console.debug('Plain message => %s', message)
          msg = nem.PlainMessage.create(message)
        } else {
          console.debug('Empty message')
          msg = nem.EmptyMessage
        }

        const transferTx = nem.TransferTransaction.create(
          nem.Deadline.create(),
          nem.Address.createFromRawAddress(address),
          [new nem.Mosaic(new nem.MosaicId('nem:xem'), nem.UInt64.fromUint(txAmount))],
          msg,
          nem.NetworkType[process.env.NETWORK]
        )
        const signedTx = faucetAccount.sign(transferTx)
        transactionHttp.announce(signedTx)
          .subscribe(
            tx => {
              req.flash('txHash', signedTx.hash)
              res.redirect(`/?${query}`)
            },
            err => {
              console.error(err)
              // req.flash('error', 'Transaction failed. Please try again.')
              req.flash('error', err.data ? err.data.message : err.toString())
              res.redirect('/?' + query)
            }
          )
      },
      err => {
        req.flash('error', `Something wrong with transaction. Please re-try it.`)
        console.error(err)
        res.redirect(`/?${query}`)
      }
    )
})

async function requestReCaptchaValidation(url) {
  return new Promise((resolve, reject) => {
    request({url: url, json: true}, (err, res) => {
      if (!err && res.statusCode == 200 && res.body['success']) {
        resolve(res.body)
      } else {
        reject(err)
      }
    })
  })
}

function reCaptchaValidationUrl(response) {
  const q = qs.stringify({
    secret: process.env.RECAPTCHA_SERVER_SECRET,
    response: response
  })
  return `${GOOGLE_RECAPTCHA_ENDPOINT}?${q}`
}

function randomInRange(from, to) {
  return ~~(Math.random() * (from - to + 1) + to)
}

function sanitizeAmount(amount) {
  amount = parseFloat(amount) * 1000000
  if(amount > MAX_XEM) {
    return MAX_XEM
  } else if(amount < 0) {
    return 0
  } else {
    return amount
  }
}

module.exports = router
