# :potable_water: NEM Faucet

## :heartbeat: Demo

- [NEM2 Test Faucet](http://test-nem2-faucet.44uk.net/)

## :sparkles: Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Need to set `PRIVATE_KEY`(PrivateKey of your faucet account) while deployment.

If you want to use ReCaptcha, set both variables `RECAPTCHA_CLIENT_SECRET` and `RECAPTCHA_SERVER_SECRET`.

## :whale: Dockerimage

- [Docker Hub](https://cloud.docker.com/repository/docker/44uk/nem2-faucet)

## :handshake: Using with catapult-service-bootstrap

### Build or Pull image

```console
# build image
$ docker build -t my-nem2-faucet .

# or pull from dockerhub
$ docker pull 44uk/nem2-faucet
```

### Add as service.

```yaml:docker-compose.yml
faucet:
  # image: my-nem2-faucet # in case of built image
  image: 44uk/nem2-faucet
  stop_signal: SIGINT
  environment:
    - NETWORK=MIJIN_TEST
    - API_HOST=http://rest-gateway
    - PRIVATE_KEY=__PRIVATE_KEY__
  ports:
    - '4000:4000'
  depends_on:
    - rest-gateway
```

## :fire: Customize

```shell
# set enviroment variables
# * COOKIE_SECRET
# * PORT
# * NETWORK
# * API_URL
# * PRIVATE_KEY
# * XEM_MAX
# * XEM_MIN
# * XEM_OPT
# * ENOUGH_BALANCE
# * MAX_UNCONFIRMED
# * WAIT_HEIGHT
# * RECAPTCHA_CLIENT_SECRET
# * RECAPTCHA_SERVER_SECRET
# or edit .env

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
