import { isStr, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { parseNative } from '../libraries/braveUtils/index.js';
import { buildRequests, interpretResponse } from '../libraries/braveUtils/buildAndInterpret.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'brave';
const DEFAULT_CUR = 'USD';
const ENDPOINT_URL = `https://point.bravegroup.tv/?t=2&partner=hash`;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => !!(bid.params.placementId && bid.params.placementId.toString().length === 32),

  buildRequests: (validBidRequests, bidderRequest) => buildRequests(validBidRequests, bidderRequest, ENDPOINT_URL, DEFAULT_CUR),

  interpretResponse: (serverResponse) => interpretResponse(serverResponse, DEFAULT_CUR, parseNative),

  onBidWon: (bid) => {
    if (isStr(bid.nurl) && bid.nurl !== '') {
      triggerPixel(bid.nurl);
    }
  }
};

registerBidder(spec);
