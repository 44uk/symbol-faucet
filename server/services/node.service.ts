import { map } from 'rxjs/operators'
import { NodeHttp, NetworkType } from 'nem2-sdk'
import { retryWithDelay } from '../libs/operators'

export class NodeService {
  private apiUrl: string

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  getNetworkType() {
    const nodeHttp = new NodeHttp(this.apiUrl)
    return nodeHttp.getNodeInfo()
      .pipe(
        retryWithDelay({ delay: 5000 }),
        map(nodeInfo => NetworkType[nodeInfo.networkIdentifier])
      )
  }
}

export default NodeService
