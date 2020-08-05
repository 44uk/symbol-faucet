<template lang="pug">
section.section
  .container
    .content
      h3.title 💾 History
      ul
        li(v-for="hash of txHashes" :key="hash")
          a(:href="`${publicUrl}/transactions/confirmed/${hash}`" target="_blank") {{ hash }}
</template>

<script>
export default {
  props: {
    publicUrl: { required: true, type: String },
    txHashes: { required: true, type: Array },
  },
}
</script>
