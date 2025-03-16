import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse, getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'mathildeads';
const AD_URL = 'https://endpoint2.mathilde-ads.com/pbjs';
const SYNC_URL = 'https://cs2.mathilde-ads.com';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(['placementId']),
  buildRequests: buildRequests(AD_URL),
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
