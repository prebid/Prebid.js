import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse, getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'pubcircle';
const AD_URL = 'https://ml.pubcircle.ai/pbjs';
const SYNC_URL = 'https://cs.pubcircle.ai';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(['placementId']),
  buildRequests: buildRequests(AD_URL),
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
