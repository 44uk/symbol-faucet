import {
  Account,
  NetworkType,
  MosaicId,
  RepositoryFactoryHttp
} from 'symbol-sdk'

import { env, retryWithDelay } from "./libs"

import {
  MosaicService,
} from './services'

export interface IAppConfig {
  PRIVATE_KEY: string | undefined
  GENERATION_HASH: string
  API_URL: string
  PUBLIC_URL: string
  NETWORK_TYPE: NetworkType
  MOSAIC_FQN: string
  MOSAIC_ID: MosaicId
  OUT_MIN: number
  OUT_MAX: number
  OUT_OPT: number
  FEE_MULTIPLIER: number | undefined
  MAX_FEE: number | undefined
  MAX_DEADLINE: number
  MAX_UNCONFIRMED: number
  MAX_BALANCE: number
  WAIT_BLOCK: number
  RECAPTCHA_ENABLED: boolean
  RECAPTCHA_CLIENT_SECRET: string | undefined
  RECAPTCHA_SERVER_SECRET: string | undefined
  RECAPTCHA_ENDPOINT: string
  FAUCET_ACCOUNT: Account
}

const repoFactory = new RepositoryFactoryHttp(env.API_URL)
const networkRepo = repoFactory.createNetworkRepository()
const namespaceRepo = repoFactory.createNamespaceRepository()

export const init = async () => {
  let generationHash = env.GENERATION_HASH || ""
  if (!/[0-9A-Fa-f]{64}/.test(generationHash)) {
    try {
      generationHash = await repoFactory.getGenerationHash()
        .pipe(retryWithDelay({ delay: 5000 }))
        .toPromise()
    } catch(error) {
      console.error(error)
      throw new Error('Failed to get GenerationHash from API Node')
    }
    console.info(`Get GenerationHash from API Node: "${generationHash}"`)
  }

  let networkType: NetworkType
  if (/(MIJIN_TEST|MIJIN|TEST_NET|MAIN_NET)/.test(env.NETWORK_TYPE)) {
    // @ts-ignore
    networkType = NetworkType[env.NETWORK_TYPE]
    console.info(`Set NetworkType from ENV: "${env.NETWORK_TYPE}"`)
  } else {
    try {
      networkType = await repoFactory.getNetworkType()
        .pipe(retryWithDelay({ delay: 5000 }))
        .toPromise()

    } catch(error) {
      console.error(error)
      throw new Error('Failed to get NetworkType from API Node')
    }
    console.info(`Get NetworkType from API Node: "${NetworkType[networkType]}"`)
  }

  const mosaicService = new MosaicService(env.API_URL)
  let mosaicId: MosaicId | null
  if (/[0-9A-Fa-f]{6}/.test(env.MOSAIC_ID)) {
    mosaicId = new MosaicId(env.MOSAIC_ID)
  } else {
    try {
      const networkProps = await networkRepo.getNetworkProperties()
        .pipe(retryWithDelay({ delay: 5000 }))
        .toPromise()
      const currencyMosaicId = (networkProps.chain.currencyMosaicId || "").replace('0x', '').replace(/'/g, '')
      mosaicId = new MosaicId(currencyMosaicId)
    } catch(error) {
      console.error(error)
      throw new Error(`Failed to get MosaicID from API Node`)
    }
    console.info(`Get MosaicID from API Node: "${mosaicId.toHex()}"`)
  }

  let mosaicFQN = (await mosaicService
    .getLinkedNames(mosaicId)
    .toPromise()
  ).join(",")
  console.info(`Get MosaicFQN from API Node: "${mosaicFQN}"`)

  const config: IAppConfig = {
    ...env,
    NETWORK_TYPE: networkType,
    GENERATION_HASH: generationHash,
    MOSAIC_FQN: mosaicFQN,
    MOSAIC_ID: mosaicId,
    FAUCET_ACCOUNT: Account.createFromPrivateKey(
      env.PRIVATE_KEY as string,
      networkType
    ),
  }
  console.debug({ config })
  return config
}

export default {
  init
}
