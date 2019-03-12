<template lang="pug">
#app
  Navbar
  nuxt
  Footer
</template>

<script>
//  <nuxt-link :to="item.to" exact-active-class="is-active">
//    <b-icon :icon="item.icon"/>
//    {{ item.title }}
//  </nuxt-link>
//  <nuxt/>

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
