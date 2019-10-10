const { map } = require('rxjs/operators')
const { BlockHttp } = require('nem2-sdk')

class BlockService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl
  }

  getGenerationHash() {
    const blockHttp = new BlockHttp(this.apiUrl)
    return blockHttp
      .getBlockByHeight(1)
      .pipe(map(blockInfo => blockInfo.generationHash))
  }
}

module.exports = {
  BlockService
}
