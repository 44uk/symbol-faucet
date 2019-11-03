const { catchError } = require('rxjs/operators')
const { AccountService } = require('../services/account.service')

const handler = conf => {
  const accountService = new AccountService(conf.API_URL)
  return (_req, res, next) => {
    accountService
      .getAccountInfoWithMosaicAmountView(conf.FAUCET_ACCOUNT, conf.MOSAIC_ID)
      .pipe(
        catchError(error => {
          if (error.code === 'ECONNREFUSED') {
            throw new Error(error.message)
          } else if (error.message) {
            const errorInfo = JSON.parse(error.message)
            throw new Error(
              `${errorInfo.statusCode}: ${errorInfo.body.message}`
            )
          } else {
            throw new Error(error)
          }
        })
      )
      .subscribe(
        info => {
          const { account, mosaicAmountView } = info
          const denominator = 10 ** mosaicAmountView.mosaicInfo.divisibility
          const balance = mosaicAmountView.amount.compact()
          const drained = balance < conf.OUT_MAX
          const faucet = {
            drained,
            network: conf.NETWORK,
            apiUrl: conf.API_URL,
            publicUrl: conf.PUBLIC_URL || conf.API_URL,
            mosaicId: conf.MOSAIC_ID.toHex(),
            outMax: conf.OUT_MAX / denominator,
            outMin: conf.OUT_MIN / denominator,
            outOpt: conf.OUT_OPT / denominator,
            step: 1 / denominator,
            address: account.address.pretty(),
            balance: balance / denominator
          }
          res.data = { faucet }
          return next()
        },
        error => {
          res.error = {
            message: error.message
          }
          return next()
        }
      )
  }
}

module.exports = handler
