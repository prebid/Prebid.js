import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse, getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'beyondmedia';
const AD_URL = 'https://backend.andbeyond.media/pbjs';
const SYNC_URL = 'https://cookies.andbeyond.media';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(['placementId']),
  buildRequests: buildRequests(AD_URL),
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
