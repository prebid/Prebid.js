import * as utils from '../src/utils';
// import {config} from '../src/config';
import {registerBidder} from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'iqm';
const ENDPOINT_URL = 'https://pbd.bids.iqm.com';
const VERSION = 'v.1.0.0';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['iqm'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.publisherId && bid.params.placementId && bid.params.tagId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @return ServerRequest Info describing the request to the server.
   * @param validBidRequests - an array of bids
   */
  buildRequests: function(validBidRequests) {
    let requestId = '';
    let siteId = '';
    let device = getDevice();
    return validBidRequests.map(bid => {
      requestId = bid.requestId;
      let bidfloor = utils.getBidIdParameter('bidfloor', bid.params);
      siteId = utils.getBidIdParameter('tagId', bid.params);
      const imp = {
        id: bid.bidId,
        secure: 1,
        bidfloor: bidfloor || 0,
        displaymanager: 'Prebid.js',
        displaymanagerver: VERSION,
        mediatype: 'banner'
      };
      imp.banner = getSize(bid.sizes);
      let data = {
        id: requestId,
        publisherId: utils.getBidIdParameter('publisherId', bid.params),
        tagId: utils.getBidIdParameter('tagId', bid.params),
        placementId: utils.getBidIdParameter('placementId', bid.params),
        device: device,
        site: {
          id: siteId,
          page: utils.getTopWindowLocation().href,
          domain: utils.getTopWindowLocation().host
        },
        imp: imp
      };
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: data
      };
    });
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    // const serverBody = serverResponse.body;
    // const headerValue = serverResponse.headers.get('some-response-header')
    const bidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse && utils.isArray(serverResponse.seatbid)) {
      utils._each(serverResponse.seatbid, function(bidList) {
        utils._each(bidList.bid, function(bid) {
          const responseCPM = parseFloat(bid.price);
          if (responseCPM > 0.0 && bid.impid) {
            // const responseNurl = bid.nurl || '';
            const bidResponse = {
              requestId: bid.impid,
              currency: serverResponse.cur || 'USD',
              cpm: responseCPM,
              netRevenue: true,
              creativeId: bid.crid || '',
              ad: bid.adm || '',
              width: bid.w || bidRequest.data.imp.banner.w,
              height: bid.h || bidRequest.data.imp.banner.h,
              ttl: bid.ttl || 300
            };

            bidResponses.push(bidResponse);
          }
        })
      });
    }
    return bidResponses;
  }
};

let getDevice = function () {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    h: screen.height,
    w: screen.width,
    dnt: _getDNT() ? 1 : 0,
    language: navigator[language].split('-')[0],
    make: navigator.vendor ? navigator.vendor : '',
    ua: navigator.userAgent,
    devicetype: _isMobile() ? 1 : _isConnectedTV() ? 3 : 2
  };
};

let _getDNT = function () {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1' || navigator.doNotTrack === 'yes';
};

let getSize = function (sizes) {
  let sizeMap;
  if (sizes.length === 2 && typeof sizes[0] === 'number' && typeof sizes[1] === 'number') {
    sizeMap = {w: sizes[0], h: sizes[1]};
  } else {
    sizeMap = {w: sizes[0][0], h: sizes[0][1]};
  }
  return sizeMap;
};

function _isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent);
}

function _isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent);
}

registerBidder(spec);
