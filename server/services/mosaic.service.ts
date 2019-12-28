import { NamespaceHttp, NamespaceId, MosaicId, NetworkType } from 'nem2-sdk'
import { retryWithDelay } from '../libs/operators'
import { flatMap, filter, map } from 'rxjs/operators'

export class MosaicService {
  private apiUrl: string
  private networkType: NetworkType | undefined

  private nsHttp: NamespaceHttp

  constructor(apiUrl: string, networkType?: NetworkType) {
    this.apiUrl = apiUrl
    this.networkType = networkType

    this.nsHttp = new NamespaceHttp(this.apiUrl, this.networkType)
  }

  getLinkedMosaicId(nsName: string) {
    return this.nsHttp.getLinkedMosaicId(new NamespaceId(nsName))
      .pipe(
        retryWithDelay({ delay: 5000 })
      )
  }

  getLinkedNames(mosaicId: MosaicId) {
    return this.nsHttp.getMosaicsNames([mosaicId])
      .pipe(
        retryWithDelay({ delay: 5000 }),
        flatMap(_ => _),
        filter(mName => mosaicId.equals(mName.mosaicId)),
        map(mName => mName.names.map(nn => nn.name))
      )
  }
}

export default MosaicService
