import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse, getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'copper6ssp';
const AD_URL = 'https://endpoint.copper6.com/pbjs';
const SYNC_URL = 'https://сsync.copper6.com';
const GVLID = 1356;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
