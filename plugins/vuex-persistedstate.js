import createPersistedState from 'vuex-persistedstate'

export default ({ store }) => {
  createPersistedState({
    key: 'nem2-faucet',
    paths: ['transactions']
  })(store)
}
