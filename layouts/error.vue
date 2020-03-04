<template lang="pug">
main.section
  .container
    .content
      h2 ❗ Something went wrong.
      p(v-if="error.message") {{error.message}}
      p
        img(:src="require(`~/assets/images/${eyecatch}.png`)")
      p Try that again, and if it still doesn't work, please inform system admin.
</template>

<script>
import _ from 'lodash'

export default {
  props: {
    error: {
      type: Object,
      default: () => {}
    },
    eyecatch: {
      type: String,
      default: () => _.sample(['computer_error_bluescreen', 'character_program_shutdown', 'computer_sagi_error'])
    }
  },
  head() {
    return { title: 'Error has occured! | SYMBOL Faucet' }
  }
}
</script>
