import { NamespaceHttp, NamespaceId, MosaicId } from 'nem2-sdk'
import { retryWithDelay } from '../libs/operators'
import { flatMap, filter, map } from 'rxjs/operators'

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

  getLinkedNames(mosaicId: MosaicId) {
    const nsHttp = new NamespaceHttp(this.apiUrl)
    return nsHttp.getMosaicsNames([mosaicId])
      .pipe(
        retryWithDelay({delay: 5000}),
        flatMap(_ => _),
        filter(mName => mosaicId.equals(mName.mosaicId)),
        map(mName => mName.names.map(nn => nn.name))
      )
  }
}

export default MosaicService
