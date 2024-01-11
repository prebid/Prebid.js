import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess } from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

const PROD_ENDPOINT_URL = 'https://rtid-sample-bidder-v5uw7sqsya-uc.a.run.app/bidder/decrypt_and_bid'
const DEV_ENDPOINT_URL = 'https://rtid-sample-bidder-la63usugka-uc.a.run.app/bidder/decrypt_and_bid'
const STG_ENDPOINT_URL = 'https://rtid-sample-bidder-lq2sckomxa-uc.a.run.app/bidder/decrypt_and_bid'
export const experianSandboxBidderSpec = {
  code: 'expSandbox',
  isBidRequestValid(bid) {
    return deepAccess(bid, 'params.env') != null;
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
      url: bidRequest.params.env === 'stg' ? STG_ENDPOINT_URL : bidRequest.params.env === 'dev' ? DEV_ENDPOINT_URL : PROD_ENDPOINT_URL,
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
