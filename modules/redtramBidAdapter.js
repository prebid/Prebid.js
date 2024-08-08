import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { bidWinReport, buildBidRequests, buildUserSyncs, interpretResponse, isBidRequestValid } from '../libraries/bidUtils/bidUtilsCommon.js';

const BIDDER_CODE = 'redtram';
const AD_URL = 'https://prebid.redtram.com/pbjs';
const SYNC_URL = 'https://prebid.redtram.com/sync';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildBidRequests(AD_URL),
  interpretResponse: interpretResponse,
  getUserSyncs: buildUserSyncs(SYNC_URL),
  onBidWon: bidWinReport
};

registerBidder(spec);
