import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ajax} from '../src/ajax.js';

const BIDDER_CODE = 'ablida';
const ENDPOINT_URL = 'https://bidder.ablida.net/prebid';

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
   * @return Array Info describing the request to the server.
   * @param validBidRequests
   * @param bidderRequest
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }
    return validBidRequests.map(bidRequest => {
      const sizes = utils.parseSizesInput(bidRequest.sizes)[0];
      const size = sizes.split('x');
      const jaySupported = 'atob' in window && 'currentScript' in document;
      const device = getDevice();
      const payload = {
        placementId: bidRequest.params.placementId,
        width: size[0],
        height: size[1],
        bidId: bidRequest.bidId,
        categories: bidRequest.params.categories,
        referer: bidderRequest.refererInfo.referer,
        jaySupported: jaySupported,
        device: device,
        adapterVersion: 2
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

    response.forEach(function(bid) {
      bid.ttl = config.getConfig('_bidderTimeout');
      bidResponses.push(bid);
    });
    return bidResponses;
  },
  onBidWon: function (bid) {
    if (!bid['nurl']) { return false; }
    ajax(bid['nurl'], null);
    return true;
  }
};

function getDevice() {
  const ua = navigator.userAgent;
  const topWindow = window.top;
  if ((/(ipad|xoom|sch-i800|playbook|silk|tablet|kindle)|(android(?!.*mobi))/i).test(ua)) {
    return 'tablet';
  }
  if ((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(ua)) {
    return 'connectedtv';
  }
  if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Windows\sCE|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i).test(ua)) {
    return 'smartphone';
  }
  const width = topWindow.innerWidth || topWindow.document.documentElement.clientWidth || topWindow.document.body.clientWidth;
  if (width > 320) {
    return 'desktop';
  }
  return 'other';
}

registerBidder(spec);
