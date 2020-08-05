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
                  button(type="submit" class="symbol-button button is-primary is-fullwidth" :disabled="faucet.drained || app.waiting")
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
    :mosaicFQN="faucet.mosaicFQN"
    :mosaicId="faucet.mosaicId"
    :outMin="faucet.outMin"
    :outMax="faucet.outMax"
  )

  History(
    v-if="txHashes.length > 0"
    :publicUrl="faucet.publicUrl"
    :txHashes="txHashes"
  )
</template>

<script>
import { Address, AccountHttp, MosaicHttp, MosaicService, RepositoryFactoryHttp } from 'symbol-sdk'
import { interval } from 'rxjs'
import { filter, mergeMap, concatMap, distinctUntilChanged } from 'rxjs/operators'

import Readme from '@/components/Readme.vue'
import History from '@/components/History.vue'

export default {
  name: 'Home',
  components: {
    Readme,
    History,
  },
  asyncData({ res, store, error }) {
    if (res.error) return error(res.error)
    if (!res.data) return {}
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
        amountPlaceholder,
      },
    }
    console.debug('asyncData: %o', data)
    return data
  },
  data() {
    return {
      app: {
        waiting: false,
        listener: null,
        poller: null,
      },
      faucet: {
        drained: false,
        network: null,
        apiUrl: null,
        publicUrl: null,
        mosaicFQN: null,
        mosaicId: null,
        outMax: null,
        outMin: null,
        outOpt: null,
        step: null,
        address: null,
        balance: null,
      },
      form: {
        recipient: null,
        message: null,
        amount: null,
        encryption: false,
      },
      txHashes: [],
    }
  },
  created() {
    if (process.browser) {
      const { recipient, amount, message, encryption } = this.$nuxt.$route.query
      this.form = {
        ...this.form,
        recipient,
        amount,
        message,
        encryption: encryption && encryption.toLowerCase() === 'true',
      }
      const factory = new RepositoryFactoryHttp(this.faucet.publicUrl, {
        websocketUrl: this.faucet.publicUrl.replace('http', 'ws'),
        websocketInjected: WebSocket,
      })
      this.app.listener = factory.createListener()
    }
  },
  async mounted() {
    const faucetAddress = Address.createFromRawAddress(this.faucet.address)
    this.app.listener.open().then(() => {
      this.app.listener.unconfirmedAdded(faucetAddress).subscribe(() => {
        this.info('Your request had been unconfirmed status!')
      })
      this.app.listener.confirmed(faucetAddress).subscribe(() => {
        this.info('Your Request had been confirmed status!')
      })
    })

    this.app.poller = this.accountPolling(faucetAddress)
    this.app.poller.subscribe((mosaicAmountView) => (this.faucet.balance = mosaicAmountView.relativeAmount()))

    if (this.$recaptcha) {
      await this.$recaptcha.init()
    }
  },
  beforeDestroy() {
    this.app.listener != null && this.app.listener.close()
    this.app.poller != null && this.app.poller.unsubscribe()
  },
  methods: {
    accountPolling(address) {
      const accountHttp = new AccountHttp(this.faucet.publicUrl)
      const mosaicHttp = new MosaicHttp(this.faucet.publicUrl)
      const mosaicService = new MosaicService(accountHttp, mosaicHttp)
      return interval(5000).pipe(
        concatMap(() => mosaicService.mosaicsAmountViewFromAddress(address)),
        mergeMap(_ => _),
        filter(_ => _.mosaicInfo.id.toHex() === this.faucet.mosaicId),
        distinctUntilChanged((prev, current) => prev.relativeAmount() === current.relativeAmount())
      )
    },
    async claim() {
      this.app.waiting = true
      this.$router.push({ path: this.$route.path, query: this.form })
      const formData = { ...this.form }
      if (this.$recaptcha) {
        formData.reCaptcha = await this.$recaptcha.execute('login')
      }
      this.$axios
        .$post('/claims', formData)
        .then((resp) => {
          this.txHashes.unshift(resp.txHash)
          this.info(`Send your declaration.`)
          this.success(`Amount: ${resp.amount} ${this.faucet.mosaicId}`)
          this.success(`Transaction Hash: ${resp.txHash}`)
        })
        .catch((err) => {
          const msg = (err.response.data && err.response.data.error) || err.response.statusTest
          this.failed(`Message from server: ${msg}`)
          this.app.waiting = false
        })
        .finally(() => {
          this.app.waiting = false
        })
    },
    info(message) {
      this.$buefy.snackbar.open({
        type: 'is-info',
        message,
        queue: false,
      })
    },
    success(message) {
      this.$buefy.snackbar.open({
        type: 'is-success',
        message,
        queue: false,
        duration: 8000,
      })
    },
    warning(message) {
      this.$buefy.snackbar.open({
        type: 'is-warning',
        message,
        queue: false,
        duration: 8000,
      })
    },
    failed(message) {
      this.$buefy.snackbar.open({
        type: 'is-danger',
        message,
        queue: false,
        duration: 8000,
      })
    },
  },
}
</script>
