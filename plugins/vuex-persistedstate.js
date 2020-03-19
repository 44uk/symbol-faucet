import createPersistedState from 'vuex-persistedstate'

export default ({ store }) => {
  createPersistedState({
    key: '__symbol-faucet',
    paths: []
  })(store)
}
