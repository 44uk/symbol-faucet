const config = require('config')
const express = require('express')
const router = express.Router()
const nem = require('nem2-sdk')
const rx = require('rxjs')
const op = require('rxjs/operators')

const MAX_XEM = parseInt(process.env.MAX_XEM || config.xem.max)
const MIN_XEM = parseInt(process.env.MIN_XEM || config.xem.min)
const OPT_XEM = parseInt(process.env.OPT_XEM || ~~((MAX_XEM + MIN_XEM) / 2))

const faucetAccount = nem.Account.createFromPrivateKey(
  process.env.PRIVATE_KEY,
  nem.NetworkType[process.env.NETWORK]
)
const API_URL = `${process.env.API_HOST}:${process.env.API_PORT}`
const accountHttp = new nem.AccountHttp(API_URL)
const mosaicService = new nem.MosaicService(
  accountHttp,
  new nem.MosaicHttp(API_URL),
  new nem.NamespaceHttp(API_URL)
)

router.get('/', function(req, res, next) {
  const address = req.query.address
  const message = req.query.message
  const encrypt = req.query.encrypt
  const mosaic  = req.query.mosaic
  const amount  = req.query.amount
  const drained = false

  accountHttp.getAccountInfo(faucetAccount.address)
    .pipe(
      op.mergeMap(account => {
        return mosaicService.mosaicsAmountViewFromAddress(faucetAccount.address)
          .pipe(
            op.mergeMap(_ => _),
            op.filter(mosaic => mosaic.fullName() === 'nem:xem'),
            op.toArray(),
            op.map(mosaics => { return {mosaics, account} })
          )
      })
    )
    .subscribe(
      data => {
        res.render('index', {
          drained: drained,
          txHash: req.flash('txHash'),
          error: req.flash('error'),
          xemMax: MAX_XEM / 1000000,
          xemMin: MIN_XEM / 1000000,
          xemOpt: OPT_XEM / 1000000,
          address: address,
          message: message,
          encrypt: encrypt,
          mosaic: mosaic,
          amount: amount,
          faucetAddress: data.account.address.pretty(),
          faucetAmount: data.mosaics[0].relativeAmount(),
          recaptcha_secret: process.env.RECAPTCHA_CLIENT_SECRET
        }
      ),
      err => next,
      () => {}
    })
})

module.exports = router
