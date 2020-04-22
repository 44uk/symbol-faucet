import {
  Account,
  MosaicService,
  TransactionType,
  MosaicId,
  UInt64,
  TransferTransaction,
  NetworkType,
  RepositoryFactoryHttp,
  AccountRepository,
  MosaicRepository,
} from 'symbol-sdk'
import { of } from 'rxjs'
import { map, mergeMap, filter, catchError, toArray, tap } from 'rxjs/operators'

export class AccountService {
  private apiUrl: string
  private networkType: NetworkType | undefined

  private accountRepo: AccountRepository
  private mosaicRepo: MosaicRepository

  constructor(apiUrl: string, networkType?: NetworkType) {
    this.apiUrl = apiUrl
    this.networkType = networkType

    const repoFactory = new RepositoryFactoryHttp(apiUrl, networkType)
    this.accountRepo = repoFactory.createAccountRepository()
    this.mosaicRepo = repoFactory.createMosaicRepository()
  }

  getAccountInfoWithMosaicAmountView(account: Account, mosaicId: MosaicId) {
    const mosaicService = new MosaicService(this.accountRepo, this.mosaicRepo)
    return this.accountRepo
      .getAccountInfo(account.address)
      .pipe(
        mergeMap(accountInfo => mosaicService.mosaicsAmountViewFromAddress(accountInfo.address)
          .pipe(
            mergeMap(_ => _),
            tap(() => {
              console.log({
                account, accountInfo
              })
            }),
            filter(mosaicAmountView => mosaicAmountView.mosaicInfo.id.equals(mosaicId)),
            map(mosaicAmountView => ({ account, accountInfo, mosaicAmountView }))
          )
        ),
        catchError(error => {
          console.error({ error })
          return of({ account, accountInfo: null, mosaicAmountView: null })
        })
      )
  }

  getTransferOutgoings(accountFrom: Account, recipient: Account, height: UInt64, wait = 10) {
    return this.accountRepo
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
    return this.accountRepo
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
