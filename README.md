# :potable_water: NEM2 (catapult) Faucet

## :heartbeat: Demo

- [symbol Test Faucet](http://test-symbol-faucet.44uk.net/)

## :handshake: Using with catapult-service-bootstrap

### Build or Pull image

```console
# build image
$ docker build -t my-symbol-faucet .

# or pull from dockerhub
$ docker pull 44uk/symbol-faucet:gorilla
```

### Add as service

#### (Quickest way) Using nemesis Private Key example

```yaml:docker-compose.yml
faucet:
  # image: my-symbol-faucet # in case of built image
  image: 44uk/symbol-faucet:gorilla
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
  image: 44uk/symbol-faucet:gorilla
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
  image: 44uk/symbol-faucet:gorilla
  stop_signal: SIGINT
  environment:
    - NEM_API_URL=http://rest-gateway:3000
    - NEM_PUBLIC_URL=http://localhost:3000
    - NEM_MOSAIC_FQN=symbol.xym
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

- [44uk\/symbol-faucet | Docker Hub](https://hub.docker.com/r/44uk/symbol-faucet)

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
# * NEM_MOSAIC_FQN (default: symbol.xym)
# * NEM_MOSAIC_HEX (for not linked mosaic)
# * NEM_OUT_MIN
# * NEM_OUT_MAX
# * NEM_OUT_OPT
# * NEM_FEE_MULTIPLIER
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

- [Symbol From NEM - Powering Possibility](https://symbolplatform.com/)
- [nemtech/symbol\-sdk\-typescript\-javascript: Symbol SDK for TypeScript & JavaScript](https://github.com/nemtech/symbol-sdk-typescript-javascript)
- [nuxt/nuxt\.js: The Vue\.js Framework](https://github.com/nuxt/nuxt.js)
- [44uk/symbol\-faucet: Faucet application for symbol development](https://github.com/44uk/symbol-faucet)
