export const state = () => ({
  attributes: {},
  transactions: []
})

export const getters = {
  attributes: state => state.attributes,
  transactions: state => state.transactions
}

export const mutations = {
  setAttributes: (state, attrs) => {
    console.log('mutations setAttributes', attrs)
    state.attributes = attrs
  },
  addTransaction: (state, tx) => {
    const newTransactions = [...state.transactions].slice(-19)
    newTransactions.push(tx)
    state.transactions = newTransactions
  }
}

export const actions = {
  nuxtServerInit: () => {
    console.debug('nuxtServerInit')
  },
  setAttributes({ commit }, { attributes }) {
    console.log('action setAttributes')
    commit('setAttributes', attributes)
  },
  addTransaction({ commit }, { transaction }) {
    commit('addTransaction', transaction)
  }
}
