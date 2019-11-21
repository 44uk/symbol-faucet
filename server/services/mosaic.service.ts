import { NamespaceHttp, NamespaceId } from 'nem2-sdk'

export class MosaicService {
  private apiUrl: string

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  getDistributionMosaicId(nsName: string) {
    const nsHttp = new NamespaceHttp(this.apiUrl)
    return nsHttp.getLinkedMosaicId(new NamespaceId(nsName)).pipe()
  }
}

export default MosaicService
