import {deepAccess, isArray} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'codefuel';
const CURRENCY = 'USD';

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
    const page = bidderRequest.refererInfo.page;
    const domain = bidderRequest.refererInfo.domain;
    const ua = navigator.userAgent;
    const devicetype = getDeviceType()
    const publisher = setOnAny(validBidRequests, 'params.publisher');
    const cur = CURRENCY;
    const endpointUrl = 'https://ai-p-codefuel-ds-rtb-us-east-1-k8s.seccint.com/prebid'
    const timeout = bidderRequest.timeout;

    validBidRequests.forEach(bid => bid.netRevenue = 'net');

    const imps = validBidRequests.map((bid, idx) => {
      const imp = {
        id: idx + 1 + ''
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
      site: { page, domain, publisher },
      device: { ua, devicetype },
      source: { fd: 1 },
      cur: [cur],
      tmax: timeout,
      imp: imps,
    };

    return {
      method: 'POST',
      url: endpointUrl,
      data: request,
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
  interpretResponse: (serverResponse, { bids }) => {
    if (!serverResponse.body) {
      return [];
    }
    const { seatbid, cur } = serverResponse.body;

    const bidResponses = flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []);

    return bids.map((bid, id) => {
      const bidResponse = bidResponses[id];
      if (bidResponse) {
        const bidObject = {
          requestId: bid.bidId,
          cpm: bidResponse.price,
          creativeId: bidResponse.crid,
          ttl: 360,
          netRevenue: true,
          currency: cur,
          mediaType: BANNER,
          ad: bidResponse.adm,
          width: bidResponse.w,
          height: bidResponse.h,
          meta: { advertiserDomains: bid.adomain ? bid.adomain : [] }
        };
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
    return [];
  }

}
registerBidder(spec);

function getDeviceType() {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 5; // 'tablet'
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 4; // 'mobile'
  }
  return 2; // 'desktop'
}

function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = deepAccess(collection[i], key);
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
  if (!isArray(requestSizes)) {
    return [];
  }

  if (requestSizes.length === 2 && !isArray(requestSizes[0])) {
    return [{
      w: parseInt(requestSizes[0], 10),
      h: parseInt(requestSizes[1], 10)
    }];
  } else if (isArray(requestSizes[0])) {
    return requestSizes.map(item =>
      ({
        w: parseInt(item[0], 10),
        h: parseInt(item[1], 10)
      })
    );
  }

  return [];
}
