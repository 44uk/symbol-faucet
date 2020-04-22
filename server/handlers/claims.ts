import _ from "lodash"
import qs from "querystring"
import axios from "axios"
import { ChronoUnit } from "js-joda"
import {
  Account,
  AccountInfo,
  Address,
  Mosaic,
  Deadline,
  UInt64,
  Message,
  EmptyMessage,
  PlainMessage,
  RepositoryFactoryHttp,
  TransactionHttp,
  TransferTransaction,
} from "symbol-sdk"
import { of, forkJoin } from "rxjs"
import { map, mergeMap } from "rxjs/operators"
import { IAppConfig } from "../bootstrap"
import { AccountService } from "../services"

// import "../patch/Deadline"

_.mixin({
  isBlank: val => (_.isEmpty(val) && !_.isNumber(val)) || _.isNaN(val)
})

export const handler = (conf: IAppConfig) => {
  const repoFactory = new RepositoryFactoryHttp(conf.API_URL)
  const chainRepo = repoFactory.createChainRepository()
  const mosaicRepo = repoFactory.createMosaicRepository()

  const transactionHttp = new TransactionHttp(conf.API_URL)
  const accountService = new AccountService(conf.API_URL, conf.NETWORK_TYPE)

  return async (req: any, res: any, next: any) => {
    const {
      recipient,
      amount,
      message,
      encryption,
      reCaptcha
    } = req.body
    console.debug({ recipient, amount, message, encryption, reCaptcha })

    if (conf.RECAPTCHA_ENABLED) {
      const reCaptchaResult = await requestReCaptchaValidation(
        reCaptcha,
        conf.RECAPTCHA_SERVER_SECRET || "",
        conf.RECAPTCHA_ENDPOINT
      ).catch(_ => false)
      if (!reCaptchaResult) {
        return res.status(422).json({ error: "Failed ReCaptcha." })
      }
    } else {
      console.debug("Disabled ReCaptcha")
    }

    const recipientAddress = Address.createFromRawAddress(recipient)
    // @ts-ignore HACK: using internal
    const recipientAccount = new Account(recipientAddress)
    console.debug(`Recipient => %s`, recipientAccount.address.pretty())

    const currentHeight = await chainRepo.getBlockchainHeight().toPromise()
    console.debug(`Current Height => %s`, currentHeight)

    forkJoin([
      // fetch mosaic info
      mosaicRepo.getMosaic(conf.MOSAIC_ID),
      // check recipient balance
      accountService.getAccountInfoWithMosaicAmountView(recipientAccount, conf.MOSAIC_ID)
        .pipe(
          map(({ accountInfo, mosaicAmountView }) => {
            if (
              mosaicAmountView &&
              mosaicAmountView.amount.compact() > conf.MAX_BALANCE
            ) {
              throw new Error(`Your account already has enough balance => (${mosaicAmountView.relativeAmount()})`)
            }
            return accountInfo
          })
        ),
      // check faucet balance
      accountService.getAccountInfoWithMosaicAmountView(conf.FAUCET_ACCOUNT, conf.MOSAIC_ID)
        .pipe(
          map(({ mosaicAmountView }) => {
            if (
              mosaicAmountView
              && mosaicAmountView.amount.compact() < conf.OUT_MAX
            ) {
              throw new Error("The faucet has been drained.")
            }
            return mosaicAmountView
          })
        ),
      // check faucet outgoing
      accountService.getTransferOutgoings(
        conf.FAUCET_ACCOUNT,
        recipientAccount,
        currentHeight,
        conf.WAIT_BLOCK
      )
        .pipe(
          map(txes => {
            if (txes.length > 0) {
              throw new Error(`Too many claiming. Please wait for ${conf.WAIT_BLOCK} blocks.`)
            }
            return txes
          })
        ),
      // check faucet unconfirmed
      accountService.getTransferUnconfirmed(conf.FAUCET_ACCOUNT, recipientAccount)
        .pipe(
          map(txes => {
            if (txes.length >= conf.MAX_UNCONFIRMED) {
              throw new Error(`Too many unconfirmed claiming. Please wait ${txes.length} transactions confirmed.`)
            }
            return txes
          })
        )
    ])
      .pipe(
        map(results => {
          const [ mosaicInfo, recipientAccount, faucetOwned ] = results

          // determine amount to pay out
          const divisibility = mosaicInfo.divisibility
// @ts-ignore WIP
          const faucetBalance = faucetOwned.amount.compact()
          const txAbsoluteAmount =
            sanitizeAmount(amount, divisibility, conf.OUT_MAX) ||
            Math.min(
              faucetBalance,
              randomInRange(conf.OUT_MIN, conf.OUT_MAX, divisibility)
            )
// @ts-ignore WIP
          console.debug(`Faucet balance => %d`, faucetOwned.relativeAmount())
// @ts-ignore WIP
          console.debug(`Mosaic divisibility => %d`, divisibility)
          console.debug(`Input amount => %s`, amount)
          console.debug(`Payout amount => %d`, txAbsoluteAmount)

          const mosaic = new Mosaic(
            mosaicInfo.id,
            UInt64.fromUint(txAbsoluteAmount)
          )

          const isMultipler = !!conf.FEE_MULTIPLIER
          const feeFactor = [
            conf.FEE_MULTIPLIER,
            conf.MAX_FEE,
            5000000 // TODO: set network multipler
          ].find(_ => !!_) as number
          const transferTx = buildTransferTransaction(
            recipientAddress,
            conf.MAX_DEADLINE,
            [mosaic],
            buildMessage(
              message,
              encryption,
              conf.FAUCET_ACCOUNT,
              recipientAccount
            ),
            feeFactor,
            isMultipler
          )

          console.debug(`FeeFactor => %s, Multipler => %s`, feeFactor, isMultipler)
          console.debug(`Generation Hash => %s`, conf.GENERATION_HASH)
          const signedTx = conf.FAUCET_ACCOUNT.sign(
            transferTx,
            conf.GENERATION_HASH
          )
          console.debug("Payload:", signedTx.payload)
          return {
            signedTx,
            relativeAmount: txAbsoluteAmount / 10 ** mosaicInfo.divisibility
          }
        }),
        mergeMap(({ signedTx, relativeAmount }) => {
          return transactionHttp.announce(signedTx).pipe(
            mergeMap(resp => of({
              resp,
              txHash: signedTx.hash,
              amount: relativeAmount
            }))
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
  message = "",
  encryption = false,
  faucetAccount: Account,
  recipientAccountInfo?: AccountInfo | null,
) => {
  if (encryption && recipientAccountInfo === undefined) {
    throw new Error("Required recipient public key exposed to encrypt message.")
  }
  if (message === "") {
    console.debug("Empty message")
    return EmptyMessage
  } else if (encryption && recipientAccountInfo) {
    console.debug("Encrypt message => %s", message)
    return faucetAccount.encryptMessage(message, recipientAccountInfo.publicAccount)
  } else {
    console.debug("Plain message => %s", message)
    return PlainMessage.create(message)
  }
}

const buildTransferTransaction = (
  address: Address,
  deadline: number,
  transferrable: Mosaic[],
  message: Message,
  feeFactor: number,
  isMultiplier = false
) => {
  let tx = TransferTransaction.create(
    Deadline.create(deadline, ChronoUnit.MINUTES),
    address,
    transferrable,
    message,
    address.networkType,
    UInt64.fromUint(feeFactor)
  )
  if(isMultiplier) {
    tx = tx.setMaxFee(feeFactor) as TransferTransaction
  }
  return tx
}

const requestReCaptchaValidation = async (resp: any, secret: string, endpoint: string) => {
  const body = qs.stringify({ resp, secret })
  const headers = { "Content-Type": "application/x-www-form-urlencoded" }
  const result = await axios
    .post(endpoint, body, { headers })
    .catch(error => error.response)
  console.debug(result)
  return result.status === 200 && result.data.success
}

const randomInRange = (from: number, to: number, base: number) => {
  const value = Math.random() * (from - to + 1) + to
  return base ? Math.round(value / 10 ** base) * 10 ** base : value
}

const sanitizeAmount = (amount: number, base: number, max: number) => {
  const absoluteAmount = amount * 10 ** base
  if (absoluteAmount > max) {
    return max
  } else if (absoluteAmount <= 0) {
    return 0
  } else {
    return absoluteAmount
  }
}

export default handler
