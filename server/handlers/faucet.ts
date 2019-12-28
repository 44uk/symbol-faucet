import { catchError, map } from 'rxjs/operators'
import { IAppConfig } from "../bootstrap"
import { AccountService } from '../services/account.service'
import { NetworkType } from 'nem2-sdk'

export const handler = (conf: IAppConfig) => {
  const accountService = new AccountService(conf.API_URL, conf.NETWORK_TYPE)

  return (_req: any, res: any, next: any) => {
    accountService.getAccountInfoWithMosaicAmountView(conf.FAUCET_ACCOUNT, conf.MOSAIC_ID)
      .pipe(
        map(info => {
          console.debug({ info })
          if(info.mosaicAmountView) return info
          else throw new Error(`{"statusCode": 200, "body": {"message": "The account has no mosaic for distributtion."}}`)
        }),
        catchError(error => {
          if (error.code === 'ECONNREFUSED') {
            throw new Error(error.message)
          } else if (error.message) {
            const eInfo = JSON.parse(error.message)
            throw new Error(`${eInfo.statusCode}: ${eInfo.body.message}`)
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
            network: NetworkType[conf.NETWORK_TYPE],
            generationHash: conf.GENERATION_HASH,
            apiUrl: conf.API_URL,
            publicUrl: conf.PUBLIC_URL || conf.API_URL,
            mosaicFQN: conf.MOSAIC_FQN,
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

export default handler
