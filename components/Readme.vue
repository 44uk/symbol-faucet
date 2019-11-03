<template lang="pug">
section.section
  .container
    .content
      h3.title 📄 Readme
      ul
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

      h3.title 📶 Node Information
      pre
        | Network: {{network}}
        | API-URL: {{publicUrl}}
        | GenerationHash: {{generationHash}}
</template>

<script>
export default {
  filters: {
    prefix0x: (val) => (/[0-9A-Fa-f]{16}/.test(val) ? `0x${val}` : val)
  },
  props: {
    mosaicId: { required: true, type: String },
    outMin: { required: true, type: Number },
    outMax: { required: true, type: Number },
    network: { required: true, type: String },
    publicUrl: { required: true, type: String },
    generationHash: { required: true, type: String },
  }
}
</script>
