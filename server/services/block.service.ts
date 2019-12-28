import { map } from 'rxjs/operators'
import { BlockHttp } from 'nem2-sdk'
import { retryWithDelay } from '../libs/operators'

export class BlockService {
  private apiUrl: string

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  getGenerationHash() {
    const blockHttp = new BlockHttp(this.apiUrl)
    return blockHttp.getBlockByHeight("1")
      .pipe(
        retryWithDelay({ delay: 5000 }),
        map(blockInfo => blockInfo.generationHash)
      )
  }
}

export default BlockService
