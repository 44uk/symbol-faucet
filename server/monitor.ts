import { RepositoryFactoryHttp, Address } from 'symbol-sdk'

interface IHook {
  onStatus?:      (info: any) => void
  onUnconfirmed?: (info: any) => void
  onConfirmed?:   (info: any) => void
}

export const Monitor = (url: string, address: Address, hooks: IHook = {}) => {
  const nextObserver = (label: string, hook?: any) => (info: any) => {
    typeof hook === 'function' && hook(info)
    console.log('[%s]\n%s\n', label, JSON.stringify(info))
  }
  const errorObserver = (err: any) => console.error(err)
  const factory = new RepositoryFactoryHttp(url)
  const listener = factory.createListener()
  listener.open().then(() => {
    listener
      .status(address)
      .subscribe(
        nextObserver('STATUS', hooks.onStatus),
        errorObserver
      )
    listener
      .unconfirmedAdded(address)
      .subscribe(
        nextObserver('UNCONFIRMED', hooks.onUnconfirmed),
        errorObserver
      )
    listener
      .confirmed(address)
      .subscribe(
        nextObserver('CONFIRMED', hooks.onConfirmed),
        errorObserver
      )
  })
  return listener
}

export default Monitor
