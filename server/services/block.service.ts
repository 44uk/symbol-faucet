import { map } from 'rxjs/operators'
import { BlockHttp } from 'nem2-sdk'

export class BlockService {
  private apiUrl: string

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  getGenerationHash() {
    const blockHttp = new BlockHttp(this.apiUrl)
    return blockHttp
      .getBlockByHeight(1)
      .pipe(map(blockInfo => blockInfo.generationHash))
  }
}

export default BlockService
