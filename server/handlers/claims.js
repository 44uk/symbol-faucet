const qs = require('querystring')
const axios = require('axios')
const jsJoda = require('js-joda')
const {
  Account,
  Address,
  Mosaic,
  UInt64,
  EmptyMessage,
  PlainMessage,
  TransferTransaction,
  Deadline,
  ChainHttp,
  TransactionHttp,
  MosaicHttp
} = require('nem2-sdk')
const rx = require('rxjs')
const { of, forkJoin } = require('rxjs')
const { map, mergeMap, tap, catchError } = require('rxjs/operators')
const _ = require('lodash')
_.mixin({
  isBlank: val => {
    return (_.isEmpty(val) && !_.isNumber(val)) || _.isNaN(val)
  }
})

const { AccountService } = require('../services/account.service')

const handler = conf => {
  const chainHttp = new ChainHttp(conf.API_URL)
  const mosaicHttp = new MosaicHttp(conf.API_URL)
  const transactionHttp = new TransactionHttp(conf.API_URL)
  const accountService = new AccountService(conf.API_URL)

  return async (req, res, next) => {
    const { recipient, amount, message, encryption, reCaptcha } = req.body
    console.debug({ recipient, amount, message, encryption, reCaptcha })

    if (conf.RECAPTCHA_ENABLED) {
      const reCaptchaResult = await requestReCaptchaValidation(
        reCaptcha,
        conf.RECAPTCHA_SERVER_SECRET,
        conf.RECAPTCHA_ENDPOINT
      ).catch(_ => false)
      if (!reCaptchaResult) {
        return res.status(422).json({ error: 'Failed ReCaptcha.' })
      }
    } else {
      console.debug('Disabled ReCaptcha')
    }

    const recipientAddress = Address.createFromRawAddress(recipient)
    const recipientAccount = new Account(recipientAddress)
    console.debug(`Recipient => %s`, recipientAccount.address.pretty())

    const currentHeight = await chainHttp.getBlockchainHeight().toPromise()
    forkJoin([
      // fetch mosaic info
      mosaicHttp.getMosaic(conf.MOSAIC_ID),
      // check recipient balance
      accountService
        .getAccountInfoWithMosaicAmountView(recipientAccount, conf.MOSAIC_ID)
        .pipe(
          map(({ account, mosaicAmountView }) => {
            if (
              mosaicAmountView &&
              mosaicAmountView.amount.compact() > conf.MAX_BALANCE
            ) {
              throw new Error(
                `Your account already has enough balance => (${mosaicAmountView.relativeAmount()})`
              )
            }
            return account
          })
        ),
      // check faucet balance
      accountService
        .getAccountInfoWithMosaicAmountView(conf.FAUCET_ACCOUNT, conf.MOSAIC_ID)
        .pipe(
          map(({ account, mosaicAmountView }) => {
            if (mosaicAmountView.amount.compact() < conf.OUT_MAX) {
              throw new Error('The faucet has been drained.')
            }
            return mosaicAmountView
          })
        ),
      // check faucet outgoing
      accountService
        .getTransferOutgoings(
          conf.FAUCET_ACCOUNT,
          recipientAccount,
          currentHeight,
          conf.WAIT_BLOCK
        )
        .pipe(
          map(txes => {
            if (txes.length > 0) {
              throw new Error(
                `Too many claiming. Please wait for ${conf.WAIT_BLOCK} blocks.`
              )
            }
            return txes
          })
        ),
      // check faucet unconfirmed
      accountService
        .getTransferUnconfirmed(conf.FAUCET_ACCOUNT, recipientAccount)
        .pipe(
          map(txes => {
            if (txes.length >= conf.MAX_UNCONFIRMED) {
              throw new Error(
                `Too many unconfirmed claiming. Please wait ${txes.length} transactions confirmed.`
              )
            }
            return txes
          })
        )
    ])
      .pipe(
        map(results => {
          const [mosaicInfo, recipientAccount, faucetOwned] = results

          // determine amount to pay out
          const divisibility = mosaicInfo.divisibility
          const faucetBalance = faucetOwned.amount.compact()
          const txAbsoluteAmount =
            sanitizeAmount(amount, divisibility, conf.OUT_MAX) ||
            Math.min(
              faucetBalance,
              randomInRange(conf.OUT_MIN, conf.OUT_MAX, divisibility)
            )
          console.debug(`Faucet balance => %d`, faucetOwned.relativeAmount())
          console.debug(`Mosaic divisibility => %d`, divisibility)
          console.debug(`Input amount => %s`, amount)
          console.debug(`Payout amount => %d`, txAbsoluteAmount)

          const mosaic = new Mosaic(
            mosaicInfo.id,
            UInt64.fromUint(txAbsoluteAmount)
          )

          const transferTx = buildTransferTransaction(
            recipientAccount.address,
            conf.MAX_DEADLINE,
            [mosaic],
            buildMessage(
              message,
              encryption,
              conf.FAUCET_ACCOUNT,
              recipientAccount
            ),
            conf.MAX_FEE ? conf.MAX_FEE : undefined
          )

          console.debug(`Fee => %s`, conf.MAX_FEE)
          console.debug(`Generation Hash => %s`, conf.GENERATION_HASH)
          const signedTx = conf.FAUCET_ACCOUNT.sign(
            transferTx,
            conf.GENERATION_HASH
          )
          return {
            signedTx,
            relativeAmount: txAbsoluteAmount / 10 ** mosaicInfo.divisibility
          }
        }),
        mergeMap(({ signedTx, relativeAmount }) => {
          return transactionHttp.announce(signedTx).pipe(
            mergeMap(resp => {
              return rx.of({
                resp,
                txHash: signedTx.hash,
                amount: relativeAmount
              })
            })
          )
        })
      )
      .subscribe(
        result => res.json(result),
        error => {
          console.error(error)
          res.status(422).json({ error: error.message })
        }
      )
  }
}

const buildMessage = (
  message = '',
  encryption = false,
  faucetAccount,
  publicAccount = null
) => {
  console.log(publicAccount)
  if (encryption && (publicAccount == null || publicAccount.keyPair == null)) {
    throw new Error('Required recipient public key exposed to encrypt message.')
  }
  if (_.isBlank(message)) {
    console.debug('Empty message')
    return EmptyMessage
  } else if (encryption) {
    console.debug('Encrypt message => %s', message)
    return faucetAccount.encryptMessage(message, publicAccount)
  } else {
    console.debug('Plain message => %s', message)
    return PlainMessage.create(message)
  }
}

const buildTransferTransaction = (
  address,
  deadline,
  transferrable,
  message,
  fee
) => {
  return TransferTransaction.create(
    Deadline.create(deadline, jsJoda.ChronoUnit.MINUTES),
    address,
    transferrable,
    message,
    address.networkType,
    UInt64.fromUint(fee)
  )
}

const requestReCaptchaValidation = async (response, secret, endpoint) => {
  const body = qs.stringify({ response, secret })
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
  const result = await axios
    .post(endpoint, body, { headers })
    .catch(err => err.response)
  console.debug(result)
  return result.status === 200 && result.data.success
}

const randomInRange = (from, to, base) => {
  const value = parseInt(Math.random() * (from - to + 1) + to)
  return base ? Math.round(value / 10 ** base) * 10 ** base : value
}

const sanitizeAmount = (amount, base, max) => {
  const absoluteAmount = parseFloat(amount) * 10 ** base
  if (absoluteAmount > max) {
    return max
  } else if (absoluteAmount <= 0) {
    return 0
  } else {
    return absoluteAmount
  }
}

module.exports = handler
