const qs = require('querystring')
const axios = require('axios')
const jsJoda = require('js-joda')
const nem = require('nem2-sdk')
const rx = require('rxjs')
const op = require('rxjs/operators')
const _ = require('lodash')
_.mixin({
  isBlank: val => {
    return (_.isEmpty(val) && !_.isNumber(val)) || _.isNaN(val)
  }
})

const GOOGLE_RECAPTCHA_ENDPOINT =
  'https://www.google.com/recaptcha/api/siteverify'
const GOOGLE_RECAPTCHA_ENABLED = !_.isBlank(process.env.RECAPTCHA_SERVER_SECRET)
const API_URL = process.env.NEM_API_URL
const MOSAIC_FQN = process.env.NEM_MOSAIC_FQN || 'nem:xem'
const OUT_MIN = parseInt(process.env.NEM_OUT_MIN)
const OUT_MAX = parseInt(process.env.NEM_OUT_MAX)
const ENOUGH_BALANCE = parseInt(process.env.NEM_ENOUGH_BALANCE || '100000000000')
const MAX_UNCONFIRMED = parseInt(process.env.NEM_MAX_UNCONFIRMED || '99')
const WAIT_HEIGHT = parseInt(process.env.NEM_WAIT_HEIGHT || '0')

const faucetAccount = nem.Account.createFromPrivateKey(
  process.env.NEM_PRIVATE_KEY,
  nem.NetworkType[process.env.NEM_NETWORK]
)
const accountHttp = new nem.AccountHttp(API_URL)
const blockchainHttp = new nem.BlockchainHttp(API_URL)
const namespaceHttp = new nem.NamespaceHttp(API_URL)
const mosaicHttp = new nem.MosaicHttp(API_URL)
const mosaicService = new nem.MosaicService(
  accountHttp,
  mosaicHttp,
  namespaceHttp
)
const transactionHttp = new nem.TransactionHttp(API_URL)

const handler = async (req, res, next) => {
  const { recipient, amount, message, reCaptcha } = req.body
  if (GOOGLE_RECAPTCHA_ENABLED) {
    const reCaptchaResult = await requestReCaptchaValidation(reCaptcha).catch(
      _ => false
    )
    if (!reCaptchaResult) {
      res.status(422).json({ error: 'Failed ReCaptcha.' })
    }
  }

  const currentHeight = await blockchainHttp
    .getBlockchainHeight()
    .toPromise()
    .catch(err => err)
  const recipientAddress = nem.Address.createFromRawAddress(recipient)
  console.debug(`Current Height => %d`, currentHeight.compact())
  console.debug(`Recipient => %s`, recipientAddress.pretty())

  rx.forkJoin([
    mosaicService.mosaicsAmountViewFromAddress(recipientAddress).pipe(
      op.mergeMap(_ => _),
      op.find(mo => mo.fullName() === MOSAIC_FQN),
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message)
        }
        const response = JSON.parse(err.response.text)
        if (response.code === 'ResourceNotFound') {
          return rx.of(null)
        } else {
          throw new Error('Something wrong with MosaicService response')
        }
      }),
      op.map(mosaic => {
        if (mosaic && mosaic.amount.compact() > ENOUGH_BALANCE) {
          throw new Error(
            `Your account already has enough balance => (${mosaic.relativeAmount()})`
          )
        }
        return mosaic
      })
    ),
    mosaicService.mosaicsAmountViewFromAddress(faucetAccount.address).pipe(
      op.mergeMap(_ => _),
      op.find(mo => mo.fullName() === MOSAIC_FQN),
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message)
        }
        const response = JSON.parse(err.response.text)
        if (response.code === 'ResourceNotFound') {
          return rx.of(null)
        } else {
          throw new Error('Something wrong with MosaicService response')
        }
      }),
      op.map(mosaic => {
        if (mosaic.amount.compact() < OUT_MAX) {
          throw new Error('The faucet has been drained.')
        }
        return mosaic
      })
    ),
    mosaicHttp.getMosaic(new nem.MosaicId(MOSAIC_FQN)),
    accountHttp.outgoingTransactions(faucetAccount, { pageSize: 25 }).pipe(
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message)
        }
      }),
      op.mergeMap(_ => _),
      op.filter(tx => tx.type === nem.TransactionType.TRANSFER),
      op.filter(tx => {
        return (
          tx.recipient.equals(recipientAddress) &&
          currentHeight.compact() - tx.transactionInfo.height.compact() <
          WAIT_HEIGHT
        )
      }),
      op.toArray(),
      op.map(txes => {
        if (txes.length > 0) {
          throw new Error(
            `Too many claiming. Please wait for ${WAIT_HEIGHT} blocks.`
          )
        }
        return true
      })
    ),
    accountHttp.unconfirmedTransactions(faucetAccount, { pageSize: 25 }).pipe(
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message)
        }
      }),
      op.mergeMap(_ => _),
      op.filter(tx => tx.type === nem.TransactionType.TRANSFER),
      op.filter(tx => tx.recipient.equals(recipientAddress)),
      op.toArray(),
      op.map(txes => {
        if (txes.length > MAX_UNCONFIRMED) {
          throw new Error(
            `Too many unconfirmed claiming. Please wait for blocks confirmed.`
          )
        }
        return true
      })
    )
  ])
    .pipe(
      op.mergeMap(results => {
        const [, faucetOwned, mosaicInfo, outgoings, unconfirmed] = results

        if (!(outgoings && unconfirmed)) {
          throw new Error(
            'Something wrong with outgoing or unconfirmed checking.'
          )
        }

        // determine amount to pay out
        const faucetBalance = faucetOwned.amount.compact()
        const divisibility = mosaicInfo.divisibility
        const txAbsoluteAmount =
          sanitizeAmount(amount, divisibility) ||
          Math.min(faucetBalance, randomInRange(OUT_MIN, OUT_MAX, divisibility))
        console.debug(`Faucet balance => %d`, faucetOwned.relativeAmount())
        console.debug(`Mosaic divisibility => %d`, mosaicInfo.divisibility)
        console.debug(`Application amount => %s`, amount)
        console.debug(`Payout amount => %d`, txAbsoluteAmount)

        const mosaic = new nem.Mosaic(
          mosaicInfo.mosaicId,
          nem.UInt64.fromUint(txAbsoluteAmount)
        )
        const transferTx = buildTransferTransaction(
          recipientAddress,
          mosaic,
          buildMessage(message, req.body.encrypt, null)
        )

        const signedTx = faucetAccount.sign(transferTx)
        return transactionHttp.announce(signedTx).pipe(
          op.mergeMap(response => {
            return rx.of({
              response,
              txHash: signedTx.hash,
              amount: txAbsoluteAmount / Math.pow(10, mosaicInfo.divisibility)
            })
          })
        )
      })
    )
    .subscribe(
      result => {
        const { txHash, amount } = result
        res.json({ txHash, amount })
      },
      err => {
        console.error(err)
        res.status(422).json({ error: err.message })
      }
    )
}

function buildMessage(message, encrypt = false, publicAccount = null) {
  if (encrypt && publicAccount === null) {
    throw new Error('Public Key required to encrypt message.')
  }
  if (encrypt) {
    // TODO: nem2-sdk does not have EncryptMessage yet.
    console.debug('Encrypted message => %s', message)
    throw new Error('Encrypt message not supported.')
  } else if (_.isBlank(message)) {
    console.debug('Empty message')
    return nem.EmptyMessage
  } else {
    console.debug('Plain message => %s', message)
    return nem.PlainMessage.create(message)
  }
}

const buildTransferTransaction = (address, transferrable, message) => {
  return nem.TransferTransaction.create(
    nem.Deadline.create(1439, jsJoda.ChronoUnit.MINUTES),
    address,
    [transferrable],
    message,
    nem.NetworkType[process.env.NEM_NETWORK]
  )
}

const requestReCaptchaValidation = async response => {
  const body = qs.stringify({
    secret: process.env.RECAPTCHA_SERVER_SECRET,
    response
  })
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
  const result = await axios
    .post(GOOGLE_RECAPTCHA_ENDPOINT, body, { headers })
    .catch(err => err.response)
  return result.status === 200 && result.data.success
}

const randomInRange = (from, to, base) => {
  const value = parseInt(Math.random() * (from - to + 1) + to)
  return base ? Math.round(value / 10 ** base) * 10 ** base : value
}

const sanitizeAmount = (amount, base) => {
  const absoluteAmount = parseFloat(amount) * Math.pow(10, base)
  if (absoluteAmount > OUT_MAX) {
    return OUT_MAX
  } else if (absoluteAmount <= 0) {
    return 0
  } else {
    return absoluteAmount
  }
}

module.exports = handler
