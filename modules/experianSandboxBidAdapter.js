import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess } from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
export const experianSandboxBidderSpec = {
  code: 'expSandbox',
  isBidRequestValid(bid) {
    return deepAccess(bid, 'params.sandboxUrl') != null;
  },
  buildRequests(validBidRequests, bidderRequest) {
    const bidBody = {
      'rtid-data': {
        key: bidderRequest.ortb2.experianRtidKey,
        data: bidderRequest.ortb2.experianRtidData
      }
    }
    return validBidRequests.map((bidRequest) => ({
      method: 'POST',
      url: bidRequest.params.sandboxUrl,
      data: JSON.stringify(bidBody)
    }))
  },
  interpretResponse() {
    return [];
  },
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  aliases: ['healthmon-bidder']
}
registerBidder(experianSandboxBidderSpec)
