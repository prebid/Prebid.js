import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isStr, logError, logWarn } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { buildRequests, interpretResponse } from '../libraries/adyoulikeowUtils/buildAndInterpret.js';

/**
 * @typedef {import('./adyoulikeowBidAdapter.d.ts').AdyoulikeOWBidRequestParams} AdyoulikeOWBidRequestParams
 */

const BIDDER_CODE = 'adyoulikeOW';
const ENDPOINT_URL = `https://us-e.openweb-ayl.com/ssp/placement`;
const GVLID = 259;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * @param {{ params: AdyoulikeOWBidRequestParams }} bid
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

  // buildRequests in the shared lib now takes the endpoint as a third arg
  // (so it isn't hardcoded per-partner); Prebid core only ever calls
  // spec.buildRequests(validBidRequests, bidderRequest), so this wrapper
  // supplies it. A direct `buildRequests,` reference here would leave
  // endpointUrl undefined and throw on .replace() during a real auction.
  buildRequests: function (validBidRequests, bidderRequest) {
    return buildRequests(validBidRequests, bidderRequest, ENDPOINT_URL);
  },
  interpretResponse,

  onBidWon: function (bid) {
    if (bid.nurl && isStr(bid.nurl)) {
      ajax(bid.nurl, null, null, { method: 'GET', withCredentials: false, keepalive: true });
    }
  },

  onTimeout: function (timeoutData) {
    logError(`${BIDDER_CODE}: bid timed out`, timeoutData);
  }
};

registerBidder(spec);
