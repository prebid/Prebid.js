import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';

const BIDDER_CODE = 'axonix';
const BIDDER_VERSION = '1.0.0';

const CURRENCY = 'USD';
const DEFAULT_REGION = 'us-east-1';

function getBidFloor(bidRequest) {
  let floorInfo = {};

  if (typeof bidRequest.getFloor === 'function') {
    floorInfo = bidRequest.getFloor({
      currency: CURRENCY,
      mediaType: '*',
      size: '*'
    });
  }

  return floorInfo.floor || 0;
}

function getPageUrl(bidRequest, bidderRequest) {
  let pageUrl = config.getConfig('pageUrl');

  if (bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else if (!pageUrl) {
    pageUrl = bidderRequest.refererInfo.referer;
  }

  return bidRequest.params.secure ? pageUrl.replace(/^http:/i, 'https:') : pageUrl;
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

function getURL(params, path) {
  let { supplyId, region, endpoint } = params;
  let url;

  if (endpoint) {
    url = endpoint;
  } else if (region) {
    url = `https://openrtb-${region}.axonix.com/supply/${path}/${supplyId}`;
  } else {
    url = `https://openrtb-${DEFAULT_REGION}.axonix.com/supply/${path}/${supplyId}`
  }

  return url;
}

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    // video bid request validation
    if (bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty(VIDEO)) {
      if (!bid.mediaTypes[VIDEO].hasOwnProperty('mimes') ||
        !utils.isArray(bid.mediaTypes[VIDEO].mimes) ||
        bid.mediaTypes[VIDEO].mimes.length === 0) {
        utils.logError('mimes are mandatory for video bid request. Ad Unit: ', JSON.stringify(bid));

        return false;
      }
    }

    return !!(bid.params && bid.params.supplyId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    // device.connectiontype
    let connection = navigator.connection || navigator.webkitConnection;
    let connectiontype = 'unknown';

    if (connection && connection.effectiveType) {
      connectiontype = connection.effectiveType;
    }

    const requests = validBidRequests.map(validBidRequest => {
      // app/site
      let app;
      let site;

      if (typeof config.getConfig('app') === 'object') {
        app = config.getConfig('app');
      } else {
        site = {
          page: getPageUrl(validBidRequest, bidderRequest)
        }
      }

      const data = {
        app,
        site,
        validBidRequest,
        connectiontype,
        devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
        bidfloor: getBidFloor(validBidRequest),
        dnt: (navigator.doNotTrack === 'yes' || navigator.doNotTrack === '1' || navigator.msDoNotTrack === '1') ? 1 : 0,
        language: navigator.language,
        prebidVersion: '$prebid.version$',
        screenHeight: screen.height,
        screenWidth: screen.width,
        tmax: config.getConfig('bidderTimeout'),
        ua: navigator.userAgent,
      };

      return {
        method: 'POST',
        url: getURL(validBidRequest.params, 'prebid'),
        options: {
          withCredentials: false,
          contentType: 'application/json'
        },
        data
      };
    });

    return requests;
  },

  interpretResponse: function(serverResponse) {
    if (!utils.isArray(serverResponse)) {
      return [];
    }

    const responses = [];

    for (const response of serverResponse) {
      if (response.requestId) {
        responses.push(Object.assign(response, {
          ttl: config.getConfig('_bidderTimeout')
        }));
      }
    }

    return responses;
  },

  onTimeout: function(timeoutData) {
    const params = utils.deepAccess(timeoutData, '0.params.0');

    if (!utils.isEmpty(params)) {
      ajax(getURL(params, 'prebid/timeout'), null, timeoutData[0], {
        method: 'POST',
        options: {
          withCredentials: false,
          contentType: 'application/json'
        }
      });
    }
  },

  onBidWon: function(bids) {
    for (const bid of bids) {
      const { nurl } = bid || {};

      if (bid.nurl) {
        utils.replaceAuctionPrice(nurl, bid.cpm)
        utils.triggerPixel(nurl);
      };
    }
  }
}

registerBidder(spec);
