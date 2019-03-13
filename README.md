# :potable_water: NEM2 (catapult) Faucet

## :heartbeat: Demo

- [NEM2 Test Faucet](http://test-nem2-faucet.44uk.net/)

## :handshake: Using with catapult-service-bootstrap

### Build or Pull image

```console
# build image
$ docker build -t my-nem2-faucet .

# or pull from dockerhub
$ docker pull 44uk/nem2-faucet:cow
```

### Add as service

#### (Quickest) Using nemesis Private Key example

```yaml:docker-compose.yml
faucet:
  # image: my-nem2-faucet # in case of built image
  image: 44uk/nem2-faucet:cow
  stop_signal: SIGINT
  command: sh -c "/bin/sh /app/bin/create-env-from-generated-address.sh && /usr/local/bin/npm start"
  environment:
    - NEM_NETWORK=MIJIN_TEST
    - NEM_API_URL=http://rest-gateway:3000
    - NEM_PUBLIC_URL=http://localhost:3000
  volumes:
    - ./build/generated-addresses:/addresses:rw
  ports:
    - '4000:4000'
  depends_on:
    - rest-gateway
```

#### Using specific PrivateKey example

```yaml:docker-compose.yml
faucet:
  image: 44uk/nem2-faucet:cow
  stop_signal: SIGINT
  environment:
    - NEM_NETWORK=MIJIN_TEST
    - NEM_API_URL=http://rest-gateway:3000
    - NEM_PUBLIC_URL=http://localhost:3000
    - NEM_PRIVATE_KEY=__USING_SPECIFIED_PRIVATE_KEY__
  ports:
    - '4000:4000'
  depends_on:
    - rest-gateway
```

#### Specific Mosaic faucet example

```yaml:docker-compose.yml
faucet:
  image: 44uk/nem2-faucet:cow
  stop_signal: SIGINT
  environment:
    - NEM_NETWORK=MIJIN_TEST
    - NEM_API_URL=http://rest-gateway:3000
    - NEM_PUBLIC_URL=http://localhost:3000
    - NEM_MOSAIC_FQN=jpn:jpy
    - NEM_PRIVATE_KEY=__YOUR_PRIVATE_KEY__
  ports:
    - '4000:4000'
  depends_on:
    - rest-gateway
```

## :sparkles: Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Need to set `NEM_PRIVATE_KEY`(PrivateKey of your faucet account) while deployment.

If you want to use ReCaptcha, set both variables `RECAPTCHA_CLIENT_SECRET` and `RECAPTCHA_SERVER_SECRET`.

## :whale: Dockerimage

- [44uk\/nem2-faucet | Docker Hub](https://hub.docker.com/r/44uk/nem2-faucet)

## :fire: Customize

```shell
# set enviroment variables
# * PORT (default: 4000)
# * NEM_NETWORK (default: MIJIN_TEST)
# * NEM_PRIVATE_KEY
# * NEM_API_URL
# * NEM_PUBLIC_URL
# * NEM_MOSAIC_FQN (default: cat:currency)
# * NEM_MOSAIC_HEX (for not linked mosaic)
# * NEM_OUT_MAX
# * NEM_OUT_MIN
# * NEM_OUT_OPT
# * NEM_ENOUGH_BALANCE
# * NEM_MAX_UNCONFIRMED
# * NEM_WAIT_HEIGHT
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
- [nuxt/nuxt\.js: The Vue\.js Framework](https://github.com/nuxt/nuxt.js)
- [44uk/nem2\-faucet: Faucet application for nem2 \(catapult\)](https://github.com/44uk/nem2-faucet)
