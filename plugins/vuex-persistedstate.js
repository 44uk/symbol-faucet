import createPersistedState from 'vuex-persistedstate'

export default ({ store }) => {
  createPersistedState({
    key: '__nem2-faucet',
    paths: []
  })(store)
}
