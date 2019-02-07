# :potable_water: NEM Faucet

## :heartbeat: Demo

- [NEM2 Test Faucet](http://test-nem2-faucet.44uk.net/)

## :handshake: Using with catapult-service-bootstrap

### Build or Pull image

```console
# build image
$ docker build -t my-nem2-faucet .

# or pull from dockerhub
$ docker pull 44uk/nem2-faucet
```

### Add as service

Using nemesis Private Key automatically example.

```yaml:docker-compose.yml
faucet:
  # image: my-nem2-faucet # in case of built image
  image: 44uk/nem2-faucet
  stop_signal: SIGINT
  command: sh -c "/bin/sh /app/bin/create-env-from-generated-address.sh && /usr/local/bin/npm start"
  environment:
    - NETWORK=MIJIN_TEST
    - API_URL=http://rest-gateway:3000
  volumes:
    - ./build/generated-addresses:/addresses:rw
  ports:
    - '4000:4000'
  depends_on:
    - rest-gateway
```

Using specified PrivateKey example.

```yaml:docker-compose.yml
faucet:
  image: 44uk/nem2-faucet
  stop_signal: SIGINT
  environment:
    - NETWORK=MIJIN_TEST
    - API_URL=http://rest-gateway:3000
    - PRIVATE_KEY=__USING_SPECIFIED_PRIVATE_KEY__
  ports:
    - '4000:4000'
  depends_on:
    - rest-gateway
```

## :sparkles: Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Need to set `PRIVATE_KEY`(PrivateKey of your faucet account) while deployment.

If you want to use ReCaptcha, set both variables `RECAPTCHA_CLIENT_SECRET` and `RECAPTCHA_SERVER_SECRET`.

## :whale: Dockerimage

- [44uk\/nem2-faucet | Docker Hub](https://hub.docker.com/r/44uk/nem2-faucet)

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
# see .env.sample

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
