import {
  Account,
  AccountHttp,
  MosaicHttp,
  MosaicService,
  TransactionType,
  MosaicId,
  UInt64,
  TransferTransaction,
  NetworkType,
} from 'nem2-sdk'
import { of } from 'rxjs'
import { map, mergeMap, filter, catchError, toArray } from 'rxjs/operators'

export class AccountService {
  private apiUrl: string
  private networkType: NetworkType | undefined

  private accountHttp: AccountHttp
  private mosaicHttp: MosaicHttp

  constructor(apiUrl: string, networkType?: NetworkType) {
    this.apiUrl = apiUrl
    this.networkType = networkType

    this.accountHttp = new AccountHttp(this.apiUrl)
    this.mosaicHttp = new MosaicHttp(this.apiUrl, this.networkType)
  }

  getAccountInfoWithMosaicAmountView(account: Account, mosaicId: MosaicId) {
    const mosaicService = new MosaicService(this.accountHttp, this.mosaicHttp)
    return this.accountHttp.getAccountInfo(account.address).pipe(
      mergeMap(_ => mosaicService.mosaicsAmountViewFromAddress(account.address)
        .pipe(
          mergeMap(_ => _),
          filter(mosaicAmountView => mosaicAmountView.mosaicInfo.id.equals(mosaicId)),
          map(mosaicAmountView => ({ account, mosaicAmountView }))
        )
      ),
      catchError(error => {
        console.error({ error })
        return of({ account, mosaicAmountView: null })
      })
    )
  }

  getTransferOutgoings(accountFrom: Account, recipient: Account, height: UInt64, wait = 10) {
    return this.accountHttp
      .getAccountOutgoingTransactions(accountFrom.address)
      .pipe(
        mergeMap(_ => _),
        filter(tx => tx.type === TransactionType.TRANSFER),
        map(_ => _ as TransferTransaction),
        filter(tx => tx.recipientAddress.equals(recipient.address)),
// @ts-ignore WIP
        filter(tx => tx.transactionInfo.height.compact() > height.compact() - wait),
        toArray(),
        catchError(error => {
          console.error({ error })
          return of([])
        })
      )
  }

  getTransferUnconfirmed(accountFrom: Account, recipient: Account) {
    return this.accountHttp
      .getAccountUnconfirmedTransactions(accountFrom.address)
      .pipe(
        mergeMap(_ => _),
        filter(tx => tx.type === TransactionType.TRANSFER),
        map(_ => _ as TransferTransaction),
        filter(tx => tx.recipientAddress.equals(recipient.address)),
        toArray(),
        catchError(error => {
          console.error({ error })
          return of([])
        })
      )
  }
}

export default AccountService
