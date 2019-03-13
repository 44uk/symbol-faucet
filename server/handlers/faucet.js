const rx = require('rxjs')
const op = require('rxjs/operators')
const nem = require('nem2-sdk')

const handler = conf => {
  const accountHttp = new nem.AccountHttp(conf.API_URL)
  const namespaceHttp = new nem.NamespaceHttp(conf.API_URL)
  const mosaicHttp = new nem.MosaicHttp(conf.API_URL)
  const mosaicService = new nem.MosaicService(accountHttp, mosaicHttp)

  const distributionMosaicIdObservable = conf.MOSAIC_HEX
    ? rx.of(new nem.MosaicId(conf.MOSAIC_ID))
    : namespaceHttp.getLinkedMosaicId(new nem.NamespaceId(conf.MOSAIC_ID))

  return (_req, res, next) => {
    distributionMosaicIdObservable
      .pipe(
        op.mergeMap(distributionMosaicId => {
          return accountHttp.getAccountInfo(conf.FAUCET_ACCOUNT.address).pipe(
            op.mergeMap(account => {
              return mosaicService
                .mosaicsAmountViewFromAddress(account.address)
                .pipe(
                  op.mergeMap(_ => _),
                  op.find(mosaicView =>
                    mosaicView.mosaicInfo.mosaicId.equals(distributionMosaicId)
                  ),
                  op.map(mosaicView => ({ mosaicView, account }))
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
        info => {
          const { mosaicView, account } = info
          const denominator = Math.pow(10, mosaicView.mosaicInfo.divisibility)
          const balance = mosaicView.amount.compact()
          const drained = balance < conf.OUT_MAX
          const data = {
            attributes: {
              drained: drained,
              network: conf.NETWORK,
              apiUrl: conf.API_URL,
              publicUrl: conf.PUBLIC_URL || conf.API_URL,
              mosaicId: conf.MOSAIC_ID,
              outMax: conf.OUT_MAX / denominator,
              outMin: conf.OUT_MIN / denominator,
              outOpt: conf.OUT_OPT / denominator,
              step: 1 / denominator,
              address: account.address.pretty(),
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
}

module.exports = handler
