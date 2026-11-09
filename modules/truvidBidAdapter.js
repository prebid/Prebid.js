import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isStr, logError, logWarn, replaceAuctionPrice } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { buildRequests, interpretResponse } from '../libraries/onebidtechUtils/utils.js';

/**
 * @typedef {import('./truvidBidAdapter.d.ts').TruvidBidRequestParams} TruvidBidRequestParams
 */

const BIDDER_CODE = 'truvid';
const ENDPOINT_URL = `https://us-e.tru-bid.com/ssp/placement`;
const GVLID = 862;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * @param {{ params: TruvidBidRequestParams }} bid
   * @return {boolean}
   */
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

  buildRequests: function (validBidRequests, bidderRequest) {
    return buildRequests(validBidRequests, bidderRequest, ENDPOINT_URL);
  },
  interpretResponse,

  onBidWon: function (bid) {
    if (bid.nurl && isStr(bid.nurl)) {
      const winUrl = replaceAuctionPrice(bid.nurl, bid.originalCpm || bid.cpm);
      ajax(winUrl, null, null, { method: 'GET', withCredentials: false, keepalive: true });
    }
  },

  onTimeout: function (timeoutData) {
    logError(`${BIDDER_CODE}: bid timed out`, timeoutData);
  }
};

registerBidder(spec);
