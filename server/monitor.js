const nem = require('nem2-sdk')

module.exports = (url, address, hooks = {}) => {
  const nextObserver = (label, hook) => info => {
    typeof hook === 'function' && hook(info)
    console.log('[%s]\n%s\n', label, JSON.stringify(info))
  }
  const errorObserver = err => console.error(err)
  const listener = new nem.Listener(url)
  listener.open().then(() => {
    listener
      .status(address)
      .subscribe(nextObserver('STATUS', hooks.onStatus), errorObserver)
    listener
      .unconfirmedAdded(address)
      .subscribe(
        nextObserver('UNCONFIRMED', hooks.onUnconfirmed),
        errorObserver
      )
    listener
      .confirmed(address)
      .subscribe(nextObserver('CONFIRMED', hooks.onConfirmed), errorObserver)
  })
  return listener
}
