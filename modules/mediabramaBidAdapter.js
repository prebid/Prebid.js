
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { bidWinReport, buildBidRequests, buildUserSyncs, interpretResponse, isBidRequestValid } from '../libraries/precisoUtils/bidUtilsCommon.js';

const BIDDER_CODE = 'mediabrama';
const AD_URL = 'https://prebid.mediabrama.com/pbjs';
const SYNC_URL = 'https://prebid.mediabrama.com/sync';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildBidRequests(AD_URL),
  interpretResponse: interpretResponse,
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    return buildUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, SYNC_URL);
  },
  onBidWon: bidWinReport
};

registerBidder(spec);
