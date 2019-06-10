<template lang="pug">
nav.navbar.header.is-dark.has-shadow(role="navigation" aria-label="main navigation")
  .navbar-brand
    .navbar-item
      img(class="nem-logo" src="~/assets/images/nem_logo.svg" alt="NEM2 Faucet" width="16" height="16")
      | &ensp;
      span(style="font-weight:bold") NEM2 Faucet

  .navbar-end
    .navbar-item
      .buttons
        nuxt-link(
          to="/transactions"
          class="button is-info is-small"
          v-if="$nuxt.$route.path === '/'"
        ) Transactions
        a(
          @click="$router.go(-1)"
          class="button is-info is-small"
          v-if="$nuxt.$route.path === '/transactions'"
        ) Faucet
</template>

<style lang="stylus">
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.navbar-brand:hover .nem-logo {
  animation: spin 0.25s linear infinite;
}
</style>
