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

const handler = conf => {
  const chainHttp = new nem.ChainHttp(conf.API_URL)
  const transactionHttp = new nem.TransactionHttp(conf.API_URL)
  const accountHttp = new nem.AccountHttp(conf.API_URL)
  const namespaceHttp = new nem.NamespaceHttp(conf.API_URL)
  const mosaicHttp = new nem.MosaicHttp(conf.API_URL)
  const mosaicService = new nem.MosaicService(accountHttp, mosaicHttp)

  const distributionMosaicIdObservable = conf.MOSAIC_HEX
    ? rx.of(new nem.MosaicId(conf.MOSAIC_ID))
    : namespaceHttp.getLinkedMosaicId(new nem.NamespaceId(conf.MOSAIC_ID))

  return async (req, res, next) => {
    const { recipient, amount, message, encryption, reCaptcha } = req.body

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

    const recipientAddress = nem.Address.createFromRawAddress(recipient)
    console.debug(`Recipient => %s`, recipientAddress.pretty())

    rx.forkJoin([
      distributionMosaicIdObservable,
      chainHttp.getBlockchainHeight()
    ])
      .pipe(
        op.tap(([distributionMosaicId, currentHeight]) => {
          console.debug(`Distribution MosaicId => %o`, distributionMosaicId)
          console.debug(`Current Height => %d`, currentHeight.compact())
        }),
        op.mergeMap(([distributionMosaicId, currentHeight]) => {
          return rx.forkJoin([
            mosaicHttp.getMosaic(distributionMosaicId),
            accountHttp.getAccountInfo(recipientAddress).pipe(
              op.catchError(err => {
                if (err.code === 'ECONNREFUSED') {
                  throw new Error(err.message)
                }
                if (err.statusCode === 404) {
                  return rx.of(null) // NOTE: When PublicKey of the address is not exposed on the network.
                } else {
                  throw new Error('Something wrong with response.')
                }
              }),
              op.mergeMap(account => {
                if (!account) {
                  return rx.of(account)
                }
                return mosaicService
                  .mosaicsAmountViewFromAddress(recipientAddress)
                  .pipe(
                    op.mergeMap(_ => _),
                    op.find(mosaicView =>
                      mosaicView.mosaicInfo.mosaicId.equals(
                        distributionMosaicId
                      )
                    ),
                    op.map(mosaicView => {
                      if (
                        mosaicView &&
                        mosaicView.amount.compact() > conf.ENOUGH_BALANCE
                      ) {
                        throw new Error(
                          `Your account already has enough balance => (${mosaicView.relativeAmount()})`
                        )
                      }
                      return account
                    })
                  )
              })
            ),
            mosaicService
              .mosaicsAmountViewFromAddress(conf.FAUCET_ACCOUNT.address)
              .pipe(
                op.mergeMap(_ => _),
                op.find(mosaicView =>
                  mosaicView.mosaicInfo.mosaicId.equals(distributionMosaicId)
                ),
                op.catchError(err => {
                  if (err.code === 'ECONNREFUSED') {
                    throw new Error(err.message)
                  }
                  if (err.statusCode === 404) {
                    return rx.of(null)
                  } else {
                    throw new Error(
                      'Something wrong with MosaicService response'
                    )
                  }
                }),
                op.map(mosaic => {
                  if (mosaic.amount.compact() < conf.OUT_MAX) {
                    throw new Error('The faucet has been drained.')
                  }
                  return mosaic
                })
              ),
            accountHttp
              .outgoingTransactions(conf.FAUCET_ACCOUNT, { pageSize: 25 })
              .pipe(
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
                    currentHeight.compact() - tx.transactionInfo.height.compact() < conf.WAIT_HEIGHT
                  )
                }),
                op.toArray(),
                op.map(txes => {
                  if (txes.length > 0) {
                    throw new Error(
                      `Too many claiming. Please wait for ${conf.WAIT_HEIGHT} blocks.`
                    )
                  }
                  return true
                })
              ),
            accountHttp
              .unconfirmedTransactions(conf.FAUCET_ACCOUNT, { pageSize: 25 })
              .pipe(
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
                  if (txes.length > conf.MAX_UNCONFIRMED) {
                    throw new Error(
                      `Too many unconfirmed claiming. Please wait for blocks confirmed.`
                    )
                  }
                  return true
                })
              )
          ])
        }),
        op.mergeMap(results => {
          const [mosaicInfo, recipientAccount, faucetOwned, outgoings, unconfirmed] = results

          if (!(outgoings && unconfirmed)) {
            throw new Error(
              'Something wrong with outgoing or unconfirmed checking.'
            )
          }

          // determine amount to pay out
          const faucetBalance = faucetOwned.amount.compact()
          const divisibility = mosaicInfo.divisibility
          const txAbsoluteAmount =
            sanitizeAmount(amount, divisibility, conf.OUT_MAX) ||
            Math.min(faucetBalance, randomInRange(conf.OUT_MIN, conf.OUT_MAX, divisibility))
          console.debug(`Faucet balance => %d`, faucetOwned.relativeAmount())
          console.debug(`Mosaic divisibility => %d`, divisibility)
          console.debug(`Input amount => %s`, amount)
          console.debug(`Payout amount => %d`, txAbsoluteAmount)

          const mosaic = new nem.Mosaic(
            mosaicInfo.mosaicId,
            nem.UInt64.fromUint(txAbsoluteAmount)
          )
          const transferTx = buildTransferTransaction(
            recipientAddress,
            mosaic,
            buildMessage(message, encryption, conf.FAUCET_ACCOUNT, recipientAccount)
          )

          const signedTx = conf.FAUCET_ACCOUNT.sign(transferTx, conf.GENERATION_HASH)
          console.debug(`Generation Hash => %s`, conf.GENERATION_HASH)
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
        result => res.json(result),
        err => {
          console.error(err)
          res.status(422).json({ error: err.message })
        }
      )
  }
}

function buildMessage(message = '', encryption = false, faucetAccount, publicAccount = null) {
  if (encryption && publicAccount === null) {
    throw new Error('Required recipient public key exposed to encrypt message.')
  }
  if (_.isBlank(message)) {
    console.debug('Empty message')
    return nem.EmptyMessage
  } else if (encryption) {
    console.debug('Encrypt message => %s', message)
    return faucetAccount.encryptMessage(message, publicAccount)
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
    address.networkType
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
  const absoluteAmount = parseFloat(amount) * Math.pow(10, base)
  if (absoluteAmount > max) {
    return max
  } else if (absoluteAmount <= 0) {
    return 0
  } else {
    return absoluteAmount
  }
}

module.exports = handler
