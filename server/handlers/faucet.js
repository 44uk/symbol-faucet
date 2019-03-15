const op = require('rxjs/operators')
const nem = require('nem2-sdk')

const API_URL = process.env.NEM_API_URL || 'http://localhost:3000'
const MOSAIC_FQN = process.env.NEM_MOSAIC_FQN || 'nem:xem'
const OUT_MIN = parseInt(process.env.NEM_OUT_MIN || 500000000)
const OUT_MAX = parseInt(process.env.NEM_OUT_MAX || 100000000)
const OUT_OPT = parseInt(
  process.env.NEM_OUT_OPT || parseInt((OUT_MAX + OUT_MIN) / 2)
)

const faucetAccount = nem.Account.createFromPrivateKey(
  process.env.NEM_PRIVATE_KEY,
  nem.NetworkType[process.env.NEM_NETWORK]
)
const accountHttp = new nem.AccountHttp(API_URL)
const mosaicHttp = new nem.MosaicHttp(API_URL)
const mosaicService = new nem.MosaicService(
  accountHttp,
  mosaicHttp,
  new nem.NamespaceHttp(API_URL)
)

const handler = (_req, res, next) => {
  mosaicHttp
    .getMosaic(new nem.MosaicId(MOSAIC_FQN))
    .pipe(
      op.mergeMap(distributionMosaicInfo => {
        console.log(distributionMosaicInfo)
        return accountHttp.getAccountInfo(faucetAccount.address).pipe(
          op.mergeMap(account => {
            return mosaicService
              .mosaicsAmountViewFromAddress(account.address)
              .pipe(
                op.mergeMap(_ => _),
                op.find(mosaic => mosaic.fullName() === MOSAIC_FQN),
                op.map(mosaic => ({ mosaic, account }))
              )
          })
        )
      }),
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message)
        }
        const res = JSON.parse(err.response.text)
        if (res.code === 'ResourceNotFound') {
          throw new Error(`${res.code}: ${res.message}`)
        } else {
          throw new Error('Something wrong with MosaicService response')
        }
      })
    )
    .subscribe(
      mosaicView => {
        const denominator = Math.pow(
          10,
          mosaicView.mosaic.mosaicInfo.divisibility
        )
        const balance = mosaicView.mosaic.amount.compact()
        const drained = balance < OUT_MAX
        const data = {
          attributes: {
            drained: drained,
            network: process.env.NEM_NETWORK,
            apiUrl: API_URL,
            publicUrl: process.env.NEM_PUBLIC_URL || API_URL,
            mosaicFqn: MOSAIC_FQN,
            outMax: OUT_MAX / denominator,
            outMin: OUT_MIN / denominator,
            outOpt: OUT_OPT / denominator,
            step: 1 / denominator,
            address: mosaicView.account.address.pretty(),
            balance: balance / denominator
          }
        }
        res.data = { data }
        return next()
      },
      err => {
        res.data = { error: { message: err.message } }
        return next()
      }
    )
}

module.exports = handler
