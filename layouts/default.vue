<template lang="pug">
#app
  Navbar
  nuxt
  Footer
</template>

<script>
import Navbar from '~/components/Navbar'
import Footer from '~/components/Footer'

export default {
  components: {
    Navbar,
    Footer
  },
  head() {
    return { title: 'NEM2 Faucet' }
  }
}
</script>
