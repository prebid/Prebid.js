import {registerBidder} from '../src/adapters/bidderFactory.ts';
import {BANNER} from '../src/mediaTypes.ts';
import { buildBannerRequests, interpretBannerResponse } from '../libraries/biddoInvamiaUtils/index.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.ts').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.ts').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'biddo';
const ENDPOINT_URL = 'https://ad.adopx.net/delivery/impress';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bidRequest) {
    return !!bidRequest.params.zoneId;
  },
  buildRequests: function (validBidRequests) {
    return validBidRequests.flatMap((bidRequest) => buildBannerRequests(bidRequest, ENDPOINT_URL));
  },
  interpretResponse: function (serverResponse, { bidderRequest }) {
    return interpretBannerResponse(serverResponse, bidderRequest);
  },
};

registerBidder(spec);
