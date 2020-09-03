import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'cointraffic';
const ENDPOINT_URL = 'https://appspb.cointraffic.io/pb/tmp';

function detectDevice() {
  let hasTouchScreen
  if ('maxTouchPoints' in navigator) {
    hasTouchScreen = navigator.maxTouchPoints > 0
  } else {
    let mQ = window.matchMedia && matchMedia('(pointer:coarse)')
    if (mQ && mQ.media === '(pointer:coarse)') {
      hasTouchScreen = !!mQ.matches
    } else if ('orientation' in window) {
      hasTouchScreen = true // deprecated, but good fallback
    } else {
      // Only as a last resort, fall back to user agent sniffing
      let UA = navigator.userAgent
      hasTouchScreen = /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) || /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
    }
  }

  return hasTouchScreen && window.innerWidth < 1280 ? 'mobile' : 'desktop'
}

export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param validBidRequests
   * @param bidderRequest
   * @return Array Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }

    const device = detectDevice()

    return validBidRequests.map(bidRequest => {
      const sizes = utils.parseSizesInput(bidRequest.params.size || bidRequest.sizes);

      const payload = {
        placementId: bidRequest.params.placementId,
        device: device,
        sizes: sizes,
        bidId: bidRequest.bidId,
        referer: bidderRequest.refererInfo.referer,
      };

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (response) {
      const bidResponse = {
        requestId: response.requestId,
        cpm: response.cpm,
        currency: response.currency,
        netRevenue: response.netRevenue,
        width: response.width,
        height: response.height,
        creativeId: response.creativeId,
        ttl: response.ttl,
        ad: response.ad
      };

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  }
};

registerBidder(spec);
