import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'optout';

function getDomain(bidderRequest) {
  return utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || utils.deepAccess(window, 'location.href');
}

function getCurrency() {
  let cur = config.getConfig('currency');
  if (cur === undefined) {
    cur = {
      adServerCurrency: 'EUR',
      granularityMultiplier: 1
    };
  }
  return cur;
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return !!bid.params.publisher && !!bid.params.adslot;
  },

  buildRequests: function(validBidRequests) {
    console.log(getCurrency());
    return validBidRequests.map(bidRequest => {
      return {
        method: 'POST',
        url: 'https://prebid.adscience.nl/prebid/display',
        data: {
          requestId: bidRequest.bidId,
          publisher: bidRequest.params.publisher,
          adSlot: bidRequest.params.adslot,
          cur: getCurrency(),
          url: getDomain(bidRequest),
          ortb2: config.getConfig('ortb2'),
          consent: bidRequest.gdprConsent
        },
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    return serverResponse.body;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    return [];
  },
};
registerBidder(spec);
