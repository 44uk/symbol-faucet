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
  TransactionRepository,
  TransactionGroup,
} from 'symbol-sdk'
import { of } from 'rxjs'
import { map, mergeMap, filter, catchError, tap } from 'rxjs/operators'

export class AccountService {
  private apiUrl: string
  private networkType: NetworkType | undefined

  private transactionRepo: TransactionRepository
  private accountRepo: AccountRepository
  private mosaicRepo: MosaicRepository

  constructor(apiUrl: string, networkType?: NetworkType) {
    this.apiUrl = apiUrl
    this.networkType = networkType

    const repoFactory = new RepositoryFactoryHttp(this.apiUrl, { networkType: this.networkType })
    this.transactionRepo = repoFactory.createTransactionRepository()
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
            tap(() => console.log({ account, accountInfo })),
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
    console.debug(height.compact())
    const observable$ = this.transactionRepo
      .search({
        group: TransactionGroup.Confirmed,
        signerPublicKey: accountFrom.publicKey,
        recipientAddress: recipient.address,
        type: [TransactionType.TRANSFER]
      })
      .pipe(
        map(page => page.data as TransferTransaction[]),
        map(txes => txes
            .filter(tx => tx.transactionInfo)
            .filter(tx => tx.transactionInfo!.height.compare(height.subtract(UInt64.fromUint(wait))) === 1)
        ),
        tap(txes => console.debug(txes)),
        catchError(error => {
          console.error({ error })
          return of([] as TransferTransaction[])
        })
      )
    return observable$
  }

  getTransferUnconfirmed(accountFrom: Account, recipient: Account) {
    const observable$ = this.transactionRepo
      .search({
        group: TransactionGroup.Unconfirmed,
        signerPublicKey: accountFrom.publicKey,
        recipientAddress: recipient.address,
        type: [TransactionType.TRANSFER]
      })
      .pipe(
        map(page => page.data as TransferTransaction[]),
        catchError(error => {
          console.error({ error })
          return of([] as TransferTransaction[])
        })
      )
    return observable$
  }
}

export default AccountService
