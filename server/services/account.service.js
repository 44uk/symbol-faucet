const {
  AccountHttp,
  MosaicHttp,
  MosaicService,
  TransactionType
} = require('nem2-sdk')
const { of } = require('rxjs')
const { map, mergeMap, filter, catchError, toArray } = require('rxjs/operators')

class AccountService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl
    this.accountHttp = new AccountHttp(apiUrl)
    this.mosaicHttp = new MosaicHttp(apiUrl)
  }

  getAccountInfoWithMosaicAmountView(account, mosaicId) {
    const mosaicService = new MosaicService(this.accountHttp, this.mosaicHttp)
    return this.accountHttp.getAccountInfo(account.address).pipe(
      mergeMap(account => {
        return mosaicService.mosaicsAmountViewFromAddress(account.address).pipe(
          mergeMap(_ => _),
          filter(mosaicAmountView =>
            mosaicAmountView.mosaicInfo.id.equals(mosaicId)
          ),
          map(mosaicAmountView => ({ account, mosaicAmountView }))
        )
      }),
      catchError(error => {
        console.error({ error })
        return of({ account, mosaicAmountView: null })
      })
    )
  }

  getTransferOutgoings(accountFrom, recipient, height, wait = 10) {
    return this.accountHttp
      .outgoingTransactions(accountFrom.address, { pageSize: 100 })
      .pipe(
        mergeMap(_ => _),
        filter(tx => tx.type === TransactionType.TRANSFER),
        filter(tx => tx.recipientAddress.equals(recipient.address)),
        filter(
          tx => tx.transactionInfo.height.compact() > height.compact() - wait
        ),
        toArray(),
        catchError(error => {
          console.error({ error })
          return of([])
        })
      )
  }

  getTransferUnconfirmed(accountFrom, recipient) {
    return this.accountHttp
      .unconfirmedTransactions(accountFrom.address, { pageSize: 100 })
      .pipe(
        mergeMap(_ => _),
        filter(tx => tx.type === TransactionType.TRANSFER),
        filter(tx => tx.recipientAddress.equals(recipient.address)),
        toArray(),
        catchError(error => {
          console.error({ error })
          return of([])
        })
      )
  }
}

module.exports = {
  AccountService
}
