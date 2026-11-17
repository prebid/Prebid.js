import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { buildRequests, getUserSyncs, interpretResponse, isBidRequestValid } from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'robustApps';
const GVLID = 1484;
const ENDPOINT = 'https://pbjs.rbstsystems.live';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: bid => isBidRequestValid(bid, ['pid']),
  buildRequests: (validBidRequests, bidderRequest) => buildRequests(validBidRequests, bidderRequest, ENDPOINT),
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
