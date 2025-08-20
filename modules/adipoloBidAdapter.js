import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {buildRequests, getUserSyncs, interpretResponse, isBidRequestValid} from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'adipolo';

const ENDPOINTS = {
  'us-east': 'https://prebid.adipolo.live',
  'eu-center': 'https://prebid-eu.adipolo.live',
};

const GVL_ID = 1456;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: bid => isBidRequestValid(bid, ['pid']),
  buildRequests: (validBidRequests, bidderRequest) => {
    const region = validBidRequests[0]?.params.ext?.region;
    const endpoint = ENDPOINTS[region] || ENDPOINTS['us-east'];
    return buildRequests(validBidRequests, bidderRequest, endpoint)
  },
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);
