import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isStr, logError, logWarn, triggerPixel } from '../src/utils.js';
import { buildRequests, interpretResponse } from '../libraries/onebidtechUtils/utils.js';

const BIDDER_CODE = 'adyoulikeow';
const ENDPOINT_URL = `https://us-e.openweb-ayl.com/ssp/placement`;
const GVLID = 259;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    if (!bid || !bid.params || !bid.params.placementId) {
      return false;
    }

    const placementId = bid.params.placementId;
    const isValidPlacement = isStr(placementId) && placementId.length > 0;
    if (!isValidPlacement) {
      logWarn(`${BIDDER_CODE}: missing or invalid required params.placementId`);
      return false;
    }
    return true;
  },

  buildRequests: (validBidRequests, bidderRequest) => buildRequests(validBidRequests, bidderRequest, ENDPOINT_URL),
  interpretResponse,

  onBidWon: function (bid) {
    if (bid.nurl && isStr(bid.nurl)) {
      triggerPixel(bid.nurl);
    }
  },

  onTimeout: function (timeoutData) {
    logError(`${BIDDER_CODE}: bid timed out`, timeoutData);
  }
};

registerBidder(spec);
