<template lang="pug">
div
  section.section(v-if="faucet.drained")
    .container
      .notification.is-warning This faucet has been drained. Sorry for inconvenience.

  main.section
    form(@submit.prevent="claim")
      .container
        .columns
          .column.is-8
            b-field(label="Recipient")
              b-input(v-model="form.recipient"
                required
                maxlength="46"
                :pattern="formAttribute.recipientPattern"
                :title="formAttribute.recipientPlaceholder"
                :placeholder="formAttribute.recipientPlaceholder"
                :disabled="faucet.drained"
              )
          .column.is-4
            b-field(label="Amount")
              b-input(v-model.number="form.amount" type="number"
                min="0"
                :max="faucet.outOpt"
                :step="faucet.step"
                :placeholder="formAttribute.amountPlaceholder"
                :disabled="faucet.drained"
              )

        .columns
          .column.is-8
            b-field(label="Message")
              b-input(v-model="form.message"
                maxlength="1023"
                placeholder="(Optional)"
                :disabled="faucet.drained"
              )
          .column.is-4
            .columns.is-mobile
              .column.is-6
                b-field(label="Encryption")
                  b-switch(v-model="form.encryption" style="margin-top:5px")
                    | {{ form.encryption ? 'Encrypted' : 'Plain' }}
              .column.is-6
                b-field(label="Submit")
                  button(type="submit" class="button is-primary is-fullwidth" :disabled="faucet.drained || app.waiting")
                    span CLAIM!

        .columns
          .column.is-8
            b-field(label="Faucet Address")
              b-input(:value="faucet.address" readonly :disabled="faucet.drained")
          .column.is-4
            b-field(label="Faucet Balance")
              b-input(:value="faucet.balance" type="number" readonly :disabled="faucet.drained")

  Readme(
    :publicUrl="faucet.publicUrl"
    :network="faucet.network"
    :generationHash="faucet.generationHash"
    :mosaicId="faucet.mosaicId"
    :outMin="faucet.outMin"
    :outMax="faucet.outMax"
  )
</template>

<script lang="ts">
import {
  Address,
  AccountHttp,
  MosaicHttp,
  MosaicService,
  Listener
} from 'nem2-sdk'
import {
  interval
} from 'rxjs'
import {
  filter,
  mergeMap,
  concatMap,
  distinctUntilChanged,
} from 'rxjs/operators'

import Readme from '@/components/Readme.vue'

export default {
  name: 'Home',
  components: {
    Readme
  },
  data() {
    return {
      app: {
        waiting: false,
        listener: null,
        poller: null
      },
      faucet: {
        drained: false,
        network: null,
        apiUrl: null,
        publicUrl: null,
        mosaicId: null,
        outMax: null,
        outMin: null,
        outOpt: null,
        step: null,
        address: null,
        balance: null
      },
      form: {
        recipient: null,
        message: null,
        amount: null,
        encryption: false
      }
    }
  },
// @ts-ignore WIP
  asyncData({ res, store, error }) {
// @ts-ignore WIP
    if (res.error) { return error(res.error) }
// @ts-ignore WIP
    if (! res.data) { return {} }
// @ts-ignore WIP
    const faucet = res.data.faucet
    const firstChar = faucet.address[0]
    const recipientPattern = `^${firstChar}[ABCD].+`
    const recipientPlaceholder = `${faucet.network} address start with a capital ${firstChar}`
    const amountPlaceholder = `(Up to ${faucet.outOpt}. Optional, if you want fixed amount)`
    const data = {
      faucet,
      formAttribute: {
        recipientPattern,
        recipientPlaceholder,
        amountPlaceholder
      }
    }
    console.debug('asyncData: %o', data)
    return data
  },
  computed: {
  },
  created() {
    if (process.browser) {
// @ts-ignore WIP
      const { recipient, amount, message, encryption } = this.$nuxt.$route.query
// @ts-ignore WIP
      this.form = { ...this.form,
// @ts-ignore WIP
        recipient,
// @ts-ignore WIP
        amount,
// @ts-ignore WIP
        message,
// @ts-ignore WIP
        encryption: encryption && encryption.toLowerCase() === 'true'
      }
    }
  },
  async mounted() {
// @ts-ignore WIP
    const faucetAddress = Address.createFromRawAddress(this.faucet.address)
// @ts-ignore WIP
    this.app.listener = new Listener(
// @ts-ignore WIP
      this.faucet.publicUrl.replace('http', 'ws'),
      WebSocket
    )
// @ts-ignore WIP
    this.app.listener.open().then(() => {
// @ts-ignore WIP
      this.app.listener.unconfirmedAdded(faucetAddress)
// @ts-ignore WIP
        .subscribe(_ => {
// @ts-ignore WIP
          this.info('Your request had been unconfirmed status!')
        })
// @ts-ignore WIP
      this.app.listener.confirmed(faucetAddress)
// @ts-ignore WIP
        .subscribe(_ => {
// @ts-ignore WIP
          this.info('Your Request had been confirmed status!')
        })
    })

// @ts-ignore WIP
    this.app.poller = this.accountPolling(faucetAddress)
// @ts-ignore WIP
    this.app.poller.subscribe(
// @ts-ignore WIP
      mosaicAmountView => this.faucet.balance = mosaicAmountView.relativeAmount()
    )

// @ts-ignore WIP
    if (this.$recaptcha) {
// @ts-ignore WIP
      await this.$recaptcha.init()
    }
  },
  beforeDestroy() {
// @ts-ignore WIP
    this.app.listener != null && this.app.listener.close()
// @ts-ignore WIP
    this.app.poller != null && this.app.poller.unsubscribe()
  },
  methods: {
// @ts-ignore WIP
    accountPolling(address: Address) {
// @ts-ignore WIP
      const accountHttp = new AccountHttp(this.faucet.publicUrl)
// @ts-ignore WIP
      const mosaicHttp = new MosaicHttp(this.faucet.publicUrl)
// @ts-ignore WIP
      const mosaicService = new MosaicService(accountHttp, mosaicHttp)
      return interval(5000).pipe(
        concatMap(() => mosaicService.mosaicsAmountViewFromAddress(address)),
  // @ts-ignore WIP
        mergeMap(_ => _),
  // @ts-ignore WIP
        filter(_ => _.mosaicInfo.id.toHex() === this.faucet.mosaicId),
  // @ts-ignore WIP
        distinctUntilChanged((prev, current) => prev.relativeAmount() === current.relativeAmount()),
      )
    },
    async claim() {
// @ts-ignore WIP
      this.app.waiting = true
// @ts-ignore WIP
      this.$router.push({ path: this.$route.path, query: this.form })
// @ts-ignore WIP
      const formData = { ...this.form }
// @ts-ignore WIP
      if (this.$recaptcha) {
// @ts-ignore WIP
        formData.reCaptcha = await this.$recaptcha.execute('login')
      }
// @ts-ignore WIP
      this.$axios
        .$post('/claims', formData)
// @ts-ignore WIP
        .then(resp => {
          this.info(`Send your declaration.`)
// @ts-ignore WIP
          this.success(`Amount: ${resp.amount} ${this.faucet.mosaicId}`)
          this.success(`Transaction Hash: ${resp.txHash}`)
        })
// @ts-ignore WIP
        .catch(err => {
          const msg =
            (err.response.data && err.response.data.error) ||
            err.response.statusTest
          this.failed(`Message from server: ${msg}`)
        })
        .finally(() => {
// @ts-ignore WIP
          this.app.waiting = false
        })
    },
    info(message: string) {
// @ts-ignore WIP
      this.$buefy.snackbar.open({
        type: 'is-info',
        message,
        queue: false
      })
    },
    success(message: string) {
// @ts-ignore WIP
      this.$buefy.snackbar.open({
        type: 'is-success',
        message,
        queue: false,
        duration: 8000
      })
    },
    warning(message: string) {
// @ts-ignore WIP
      this.$buefy.snackbar.open({
        type: 'is-warning',
        message,
        queue: false,
        duration: 8000
      })
    },
    failed(message: string) {
// @ts-ignore WIP
      this.$buefy.snackbar.open({
        type: 'is-danger',
        message,
        queue: false,
        duration: 8000
      })
    }
  }
}
</script>
