# :potable_water: NEM Faucet

## :heartbeat: Demo

- [NEM2 Test Faucet](http://test-nem2-faucet.44uk.net/)

## :sparkles: Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Need to set `PRIVATE_KEY`(PrivateKey of your faucet account) while deployment.

If you want to use ReCaptcha, set both variables `RECAPTCHA_CLIENT_SECRET` and `RECAPTCHA_SERVER_SECRET`.

## :fire: Setup

```shell
# set enviroment variables
# * COOKIE_SECRET
# * PORT
# * NETWORK
# * API_HOST
# * API_PORT
# * PRIVATE_KEY
# * MAX_XEM
# * MIN_XEM
# * OPT_XEM
# * ENOUGH_BALANCE
# * MAX_UNCONFIRMED
# * WAIT_HEIGHT
# * RECAPTCHA_CLIENT_SECRET
# * RECAPTCHA_SERVER_SECRET
# or edit .env.development

# install packages
$ npm install

# start app
$ npm start

# or for development
$ npm run dev
```

## :muscle: Powered by

- [NEM - Distributed Ledger Technology (Blockchain) Catapult](https://www.nem.io/catapult/)
- [nemtech/nem2\-sdk\-typescript\-javascript: nem2\-sdk official for typescript & javascript](https://github.com/nemtech/nem2-sdk-typescript-javascript)
- [Express - Fast, unopinionated, minimalist web framework for node.](https://github.com/expressjs/express)
- [Beauter - A simple framework for faster and beautiful responsive sites](http://beauter.outboxcraft.com/)
