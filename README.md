# :potable_water: NEM2 (catapult) Faucet

## :heartbeat: Demo

- [NEM2 Test Faucet](http://test-nem2-faucet.44uk.net/)

## :handshake: Using with catapult-service-bootstrap

### Build or Pull image

```console
# build image
$ docker build -t my-nem2-faucet .

# or pull from dockerhub
$ docker pull 44uk/nem2-faucet:fushicho2
```

### Add as service

#### (Quickest way) Using nemesis Private Key example

```yaml:docker-compose.yml
faucet:
  # image: my-nem2-faucet # in case of built image
  image: 44uk/nem2-faucet:fushicho2
  stop_signal: SIGINT
  command: sh -c "/bin/sleep 15 && /bin/sh /app/bin/create-env.sh && /usr/local/bin/npm start"
  environment:
    - NEM_API_URL=http://rest-gateway:3000
    - NEM_PUBLIC_URL=http://localhost:3000
  volumes:
    # for reading private key from addresses.yaml
    - ../../build/generated-addresses:/addresses:ro
    # for reading generation hash from block file
    - ../../data/api-node-0/00000:/data/00000:ro
  ports:
    - '4000:4000'
  depends_on:
    - rest-gateway
    - api-node-0
```

#### Using specific PrivateKey and GenerationHash

```yaml:docker-compose.yml
faucet:
  image: 44uk/nem2-faucet:fushicho2
  stop_signal: SIGINT
  environment:
    - NEM_API_URL=http://rest-gateway:3000
    - NEM_PUBLIC_URL=http://localhost:3000
    - NEM_PRIVATE_KEY=__YOUR_PRIVATE_KEY__
  ports:
    - '4000:4000'
  depends_on:
    - rest-gateway
```

#### Specific Mosaic faucet example

```yaml:docker-compose.yml
faucet:
  image: 44uk/nem2-faucet:fushicho2
  stop_signal: SIGINT
  environment:
    - NEM_API_URL=http://rest-gateway:3000
    - NEM_PUBLIC_URL=http://localhost:3000
    - NEM_MOSAIC_FQN=3E70742C9A38ACAB
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

## :shell: Claimimg without Browser

```shell
curl http://localhost:4000/claims -d 'recipient=__YOUR_ADDRESS__'
```

## :fire: Customize

```shell
# set enviroment variables
# * PORT (default: 4000)
# * NEM_PRIVATE_KEY (required)
# * NEM_API_URL
# * NEM_PUBLIC_URL
# * NEM_NETWORK
# * NEM_GENERATION_HASH
# * NEM_MOSAIC_FQN (default: cat:currency)
# * NEM_MOSAIC_HEX (for not linked mosaic)
# * NEM_OUT_MIN
# * NEM_OUT_MAX
# * NEM_OUT_OPT
# * NEM_MAX_FEE
# * NEM_MAX_DEADLINE
# * NEM_MAX_BALANCE
# * NEM_MAX_UNCONFIRMED
# * NEM_WAIT_BLOCK
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
