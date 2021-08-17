import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'codefuel';
const CURRENCY = 'USD';
// const NATIVE_PARAMS = {
//   title: { id: 0, name: 'title' },
//   icon: { id: 2, type: 1, name: 'img' },
//   image: { id: 3, type: 3, name: 'img' },
//   sponsoredBy: { id: 5, name: 'data', type: 1 },
//   body: { id: 4, name: 'data', type: 2 },
//   cta: { id: 1, type: 12, name: 'data' }
// };

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ BANNER ],
  aliases: ['ex'], // short code
  /**
         * Determines whether or not the given bid request is valid.
         *
         * @param {BidRequest} bid The bid params to validate.
         * @return boolean True if this is a valid bid, and false otherwise.
         */
  isBidRequestValid: function(bid) {
    if (bid.nativeParams) {
      return false;
    }
    return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
  },
  /**
         * Make a server request from the list of BidRequests.
         *
         * @param {validBidRequests[]} - an array of bids
         * @return ServerRequest Info describing the request to the server.
         */
  buildRequests: function(validBidRequests, bidderRequest) {
    const page = bidderRequest.refererInfo.referer;
    const ua = navigator.userAgent;
    const test = setOnAny(validBidRequests, 'params.test');
    const publisher = setOnAny(validBidRequests, 'params.publisher');
    const bcat = setOnAny(validBidRequests, 'params.bcat');
    const badv = setOnAny(validBidRequests, 'params.badv');
    const cur = CURRENCY;
    const endpointUrl = 'https://ai-i-codefuel-ds-rtb-us-east-1-k8s-internal.seccint.com/bid'
    const timeout = bidderRequest.timeout;

    const imps = validBidRequests.map((bid, id) => {
      bid.netRevenue = 'net';
      const imp = {
        id: id + 1 + ''
      }

      if (bid.params.tagid) {
        imp.tagid = bid.params.tagid
      }

      if (bid.sizes) {
        imp.banner = {
          format: transformSizes(bid.sizes)
        }
      }

      return imp;
    });

    const request = {
      id: bidderRequest.auctionId,
      site: { page, publisher },
      device: { ua },
      source: { fd: 1 },
      cur: [cur],
      tmax: timeout,
      imp: imps,
      bcat: bcat,
      badv: badv,
      ext: {
        prebid: {
          channel: {
            name: 'pbjs',
            version: '$prebid.version$'
          }
        }
      }
    };

    if (test) {
      request.is_debug = !!test;
      request.test = 1;
    }

    if (utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies')) {
      utils.deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString)
      utils.deepSetValue(request, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies & 1)
    }
    if (bidderRequest.uspConsent) {
      utils.deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent)
    }
    if (config.getConfig('coppa') === true) {
      utils.deepSetValue(request, 'regs.coppa', config.getConfig('coppa') & 1)
    }

    return {
      method: 'POST',
      url: endpointUrl,
      data: JSON.stringify(request),
      bids: validBidRequests,
      options: {
        withCredentials: false
      }
    };
  },
  /**
         * Unpack the response from the server into a list of bids.
         *
         * @param {ServerResponse} serverResponse A successful response from the server.
         * @return {Bid[]} An array of bids which were nested inside the server.
         */
  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse.body) {
      return [];
    }
    const { seatbid, cur } = serverResponse.body;

    const bidResponses = flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []);
    // bids
    return [].map((bid, id) => {
      const bidResponse = bidResponses[id];
      if (bidResponse) {
        const bidObject = {
          requestId: bid.bidId,
          cpm: bidResponse.price,
          creativeId: bidResponse.crid,
          ttl: 360,
          netRevenue: bid.netRevenue === 'net',
          currency: cur,
          mediaType: BANNER,
          nurl: bidResponse.nurl,
          ad: bidResponse.adm,
          width: bidResponse.w,
          height: bidResponse.h
        };
        bidObject.meta = {};
        if (bidResponse.adomain && bidResponse.adomain.length > 0) {
          bidObject.meta.advertiserDomains = bidResponse.adomain;
        }
        return bidObject;
      }
    }).filter(Boolean);
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []
    return syncs;
  }

}
registerBidder(spec);

function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = utils.deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

function flatten(arr) {
  return [].concat(...arr);
}

/* Turn bid request sizes into ut-compatible format */
function transformSizes(requestSizes) {
  if (!utils.isArray(requestSizes)) {
    return [];
  }

  if (requestSizes.length === 2 && !utils.isArray(requestSizes[0])) {
    return [{
      w: parseInt(requestSizes[0], 10),
      h: parseInt(requestSizes[1], 10)
    }];
  } else if (utils.isArray(requestSizes[0])) {
    return requestSizes.map(item =>
      ({
        w: parseInt(item[0], 10),
        h: parseInt(item[1], 10)
      })
    );
  }

  return [];
}
