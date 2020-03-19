import { map } from 'rxjs/operators'
import { BlockHttp, UInt64 } from 'symbol-sdk'
import { retryWithDelay } from '../libs/operators'

export class BlockService {
  private apiUrl: string

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  getGenerationHash() {
    const blockHttp = new BlockHttp(this.apiUrl)
    return blockHttp.getBlockByHeight(UInt64.fromUint(1))
      .pipe(
        retryWithDelay({ delay: 5000 }),
        map(blockInfo => blockInfo.generationHash)
      )
  }
}

export default BlockService
