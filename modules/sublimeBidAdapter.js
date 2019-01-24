import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from '../src/config';
import * as utils from '../src/utils';

const BIDDER_CODE = 'sublime';
const DEFAULT_BID_HOST = 'pbjs.sskzlabs.com';
const DEFAULT_SAC_HOST = 'sac.ayads.co';
const DEFAULT_CALLBACK_NAME = 'sublime_prebid_callback';
const DEFAULT_PROTOCOL = 'https';
const SUBLIME_VERSION = '0.3.3';
let SUBLIME_ZONE = null;

/**
 * Send a pixel to antenna
 * @param {String} name The pixel name
 * @param {String} [requestId]
 */
function sendAntennaPixel(name, requestId) {
  if (typeof top.sublime !== 'undefined' && typeof top.sublime.analytics !== 'undefined') {
    let param = {
      qs: {
        z: SUBLIME_ZONE
      }
    };
    if (requestId) {
      param.qs.reqid = encodeURIComponent(requestId);
    }
    top.sublime.analytics.fire(SUBLIME_ZONE, name, param);
  }
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['sskz', 'sublime-skinz'],

  /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
  isBidRequestValid: (bid) => {
    return !!bid.params.zoneId;
  },

  /**
     * Make a server request from the list of BidRequests.
     *
     * @param {BidRequest[]} validBidRequests An array of bids
     * @param {Object} bidderRequest - Info describing the request to the server.
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: (validBidRequests, bidderRequest) => {
    window.sublime = window.sublime ? window.sublime : {};

    if (bidderRequest && bidderRequest.gdprConsent) {
      const gdpr = {
        consentString: bidderRequest.gdprConsent.consentString,
        gdprApplies: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
      };

      window.sublime.gdpr = (typeof window.sublime.gdpr !== 'undefined') ? window.sublime.gdpr : {};
      window.sublime.gdpr.injected = {
        consentString: gdpr.consentString,
        gdprApplies: gdpr.gdprApplies
      };
    }

    window.sublime.pbjs = (typeof window.sublime.pbjs !== 'undefined') ? window.sublime.pbjs : {};
    window.sublime.pbjs.injected = {
      bt: config.getConfig('bidderTimeout'),
      ts: Date.now()
    };

    // Grab only the first `validBidRequest`
    let bid = validBidRequests[0];

    if (validBidRequests.length > 1) {
      let leftoverZonesIds = validBidRequests.slice(1).map(bid => { return bid.params.zoneId }).join(',');
      utils.logWarn(`Sublime Adapter: ZoneIds ${leftoverZonesIds} are ignored. Only one ZoneId per page can be instanciated.`);
    }

    let params = bid.params;
    let requestId = bid.bidId || '';
    let sacHost = params.sacHost || DEFAULT_SAC_HOST;
    let bidHost = params.bidHost || DEFAULT_BID_HOST;
    let protocol = params.protocol || DEFAULT_PROTOCOL;
    let callbackName = (params.callbackName || DEFAULT_CALLBACK_NAME) + '_' + params.zoneId;
    SUBLIME_ZONE = params.zoneId;

    window[callbackName] = (response) => {
      var requestIdEncoded = encodeURIComponent(requestId);
      var hasAd = response.ad ? '1' : '0';
      var xhr = new XMLHttpRequest();
      var url = protocol + '://' + bidHost + '/notify?request_id=' + requestIdEncoded + '&a=' + hasAd + '&z=' + SUBLIME_ZONE;
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.send(
        'notify=1' +
                '&request_id=' + requestIdEncoded +
                '&ad=' + encodeURIComponent(response.ad || '') +
                '&cpm=' + encodeURIComponent(response.cpm || 0) +
                '&currency=' + encodeURIComponent(response.currency || 'USD') +
                '&v=' + SUBLIME_VERSION
      );
      return xhr;
    };
    let script = document.createElement('script');
    script.type = 'application/javascript';
    script.src = 'https://' + sacHost + '/sublime/' + SUBLIME_ZONE + '/prebid?callback=' + callbackName;
    document.body.appendChild(script);

    // Initial size object
    let sizes = {
      w: null,
      h: null
    };

    if (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes && bid.mediaTypes.banner.sizes[0]) {
      // Setting size for banner if they exist
      sizes.w = bid.mediaTypes.banner.sizes[0][0] || false;
      sizes.h = bid.mediaTypes.banner.sizes[0][1] || false;
    }

    return {
      method: 'GET',
      url: protocol + '://' + bidHost + '/bid',
      data: {
        prebid: 1,
        request_id: requestId,
        z: SUBLIME_ZONE,
        w: sizes.w || 1800,
        h: sizes.h || 1000
      }
    };
  },

  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {*} serverResponse A successful response from the server.
     * @param {*} bidRequest An object with bid request informations
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: (serverResponse, bidRequest) => {
    const bidResponses = [];
    const response = serverResponse.body;

    if (response) {
      // Setting our returned sizes object to default values
      let returnedSizes = {
        width: 1800,
        height: 1000
      };

      // Verifying Banner sizes
      if (bidRequest && bidRequest.data.w === 1 && bidRequest.data.h === 1) {
        // If banner sizes are 1x1 we set our default size object to 1x1
        returnedSizes = {
          width: 1,
          height: 1
        };
      }

      const regexNoAd = /no ad/gmi;
      const bidResponse = {
        requestId: serverResponse.body.request_id || '',
        cpm: serverResponse.body.cpm || 0,
        width: returnedSizes.width,
        height: returnedSizes.height,
        creativeId: 1,
        dealId: 1,
        currency: serverResponse.body.currency || 'USD',
        netRevenue: true,
        ttl: 600,
        referrer: '',
        ad: serverResponse.body.ad || '',
      };

      if (!response.timeout && !bidResponse.ad.match(regexNoAd) && response.cpm) {
        sendAntennaPixel('bid', bidResponse.requestId);
        bidResponses.push(bidResponse);
      }
    }

    return bidResponses;
  },
  getUserSyncs: (syncOptions, serverResponses) => {
    return [];
  }
};

registerBidder(spec);
