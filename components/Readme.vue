<template lang="pug">
section.section
  .container
    .content
      h3.title 📄 Readme
      ul
        li
          strong "{{network}}"
          | &nbsp;faucet connected to&nbsp;
          a(:href="publicUrl" target="_blank"): strong {{publicUrl}}
          | .
        li You can get&nbsp;
          strong "{{mosaicId | prefix0x}}"
          | &nbsp;randomly from&nbsp;
          strong {{outMin}}
          | &nbsp;to&nbsp;
          strong {{outMax}}
          |.
        li Please send back&nbsp;
          strong "{{mosaicId | prefix0x}}"
          | &nbsp;when you no longer need.
        li This is an experimental server, the spec can be change without notice.
        li Good luck! NEM development!
</template>

<script>
export default {
  props: {
    network: String,
    publicUrl: String,
    mosaicId: String,
    outMin: Number,
    outMax: Number
  },
  filters: {
    prefix0x: val => (/[0-9A-Fa-f]{16}/.test(val) ? `0x${val}` : val)
  }
}
</script>
