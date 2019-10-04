<template lang="pug">
main.section
  .container
    .content
      h2 ❗ Something went wrong.
      p(v-if="error.message") {{error.message}}
      p
        img(src="~/assets/images/computer_error_bluescreen.png")
      p Try that again, and if it still doesn't work, please inform system admin.
</template>

<script>
export default {
  props: {
    error: {
      type: Object,
      default: () => {}
    }
  }
}
</script>
