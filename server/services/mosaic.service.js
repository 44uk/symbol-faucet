const { NamespaceHttp, NamespaceId } = require('nem2-sdk')

class MosaicService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl
  }

  getDistributionMosaicId(nsName) {
    const nsHttp = new NamespaceHttp(this.apiUrl)
    return nsHttp.getLinkedMosaicId(new NamespaceId(nsName))
  }
}

module.exports = {
  MosaicService
}
