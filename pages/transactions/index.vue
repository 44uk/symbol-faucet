<template lang="pug">
div
  main.section
    .container
      .content
        h3.title 💾 Transactions
        ul
          li(v-for="tx in transactions")
            a(:href="`${publicUrl}/transaction/${tx.hash}`" target="_blank") {{ `${tx.amount} ${tx.mosaicId} => ${tx.recipient}` }}
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'Transactions',
  computed: {
    ...mapGetters(['attributes', 'transactions'])
  },
  asyncData({ res, store, error }) {
    const attrs = store.getters.attributes
    const data = { ...attrs }
    console.debug('asyncData: %o', data)
    return data
  }
}
</script>
