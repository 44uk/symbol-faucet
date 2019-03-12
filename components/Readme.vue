<template lang="pug">
section.section
  .container
    .content
      h3.title 📄 Readme
      ul
        li This is "{{network}}" out faucet connected to
          | &nbsp;
          a(:href="publicUrl" target="_blank") {{publicUrl}}
          | .
        li You can get "{{mosaicFqn}}" randomly from {{outMin}} to {{outMax}}.
        li This is an experimental server, the spec can be change without notice.
        li Please send back "{{mosaicFqn}}" when you no longer need.
        li Good luck! NEM development!
</template>

<script>
export default {
  props: {
    network: String,
    publicUrl: String,
    mosaicFqn: String,
    outMin: Number,
    outMax: Number
  }
}
</script>
