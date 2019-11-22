import { NamespaceHttp, NamespaceId } from 'nem2-sdk'
import { retryWithDelay } from 'server/libs/operators'

export class MosaicService {
  private apiUrl: string

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  getLinkedMosaicId(nsName: string) {
    const nsHttp = new NamespaceHttp(this.apiUrl)
    return nsHttp.getLinkedMosaicId(new NamespaceId(nsName))
      .pipe(
        retryWithDelay({delay: 5000})
      )
  }
}

export default MosaicService
