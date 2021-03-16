import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'atomx';

function getDomain() {
  var domain = '';

  try {
    if ((domain === '') && (window.top == window)) {
      domain = window.location.href;
    }

    if ((domain === '') && (window.top == window.parent)) {
      domain = document.referrer;
    }

    if (domain == '') {
      var atomxt = 'atomxtest';

      // It should be impossible to change the window.location.ancestorOrigins.
      window.location.ancestorOrigins[0] = atomxt;
      if (window.location.ancestorOrigins[0] != atomxt) {
        var ancestorOrigins = window.location.ancestorOrigins;

        // If the length is 0 we are a javascript tag running in the main domain.
        // But window.top != window or window.location.hostname is empty.
        if (ancestorOrigins.length == 0) {
          // This browser is so fucked up, just return an empty string.
          return '';
        }

        // ancestorOrigins is an array where [0] is our own window.location
        // and [length-1] is the top window.location.
        domain = ancestorOrigins[ancestorOrigins.length - 1];
      }
    }
  } catch (unused) {
  }

  if (domain === '') {
    domain = document.referrer;
  }

  if (domain === '') {
    domain = window.location.href;
  }

  return domain.substr(0, 512);
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return bid.params && (!!bid.params.id);
  },

  buildRequests: function(validBidRequests) {
    return validBidRequests.map(bidRequest => {
      return {
        method: 'GET',
        url: 'https://p.ato.mx/placement',
        data: {
          v: 12,
          id: bidRequest.params.id,
          size: utils.parseSizesInput(bidRequest.sizes)[0],
          prebid: bidRequest.bidId,
          b: 0,
          h: '7t3y9',
          type: 'javascript',
          screen: window.screen.width + 'x' + window.screen.height + 'x' + window.screen.colorDepth,
          timezone: new Date().getTimezoneOffset(),
          domain: getDomain(),
          r: document.referrer.substr(0, 512),
        },
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const body = serverResponse.body;
    const res = {
      requestId: body.code,
      cpm: body.cpm * 1000,
      width: body.width,
      height: body.height,
      creativeId: body.creative_id,
      currency: 'USD',
      netRevenue: true,
      ttl: 60,
    };

    if (body.adm) {
      res.ad = body.adm;
    } else {
      res.adUrl = body.url;
    }

    return [res];
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    return [];
  },
};
registerBidder(spec);
