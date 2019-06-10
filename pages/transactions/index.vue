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
    ...mapGetters(['transactions'])
  }
}
</script>
