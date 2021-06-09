import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'jcm';
const URL = 'https://media.adfrontiers.com/pq'

export const spec = {
  code: BIDDER_CODE,
  aliases: ['jcarter'],
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.siteId && bid.bidId);
  },

  buildRequests: function(validBidRequests) {
    var BidRequestStr = {
      bids: []
    };

    for (var i = 0; i < validBidRequests.length; i++) {
      var adSizes = '';
      var bid = validBidRequests[i];
      for (var x = 0; x < bid.sizes.length; x++) {
        adSizes += utils.parseGPTSingleSizeArray(bid.sizes[x]);
        if (x !== (bid.sizes.length - 1)) {
          adSizes += ',';
        }
      }

      BidRequestStr.bids.push({
        'callbackId': bid.bidId,
        'siteId': bid.params.siteId,
        'adSizes': adSizes,
      });
    }

    var JSONStr = JSON.stringify(BidRequestStr);
    var dataStr = 't=hb&ver=1.0&compact=true&bids=' + encodeURIComponent(JSONStr);

    return {
      method: 'GET',
      url: URL,
      data: dataStr
    }
  },

  interpretResponse: function(serverResponse) {
    const bidResponses = [];
    serverResponse = serverResponse.body;
    // loop through serverResponses
    if (serverResponse) {
      if (serverResponse.bids) {
        var bids = serverResponse.bids;
        for (var i = 0; i < bids.length; i++) {
          var bid = bids[i];
          const bidResponse = {
            requestId: bid.callbackId,
            bidderCode: spec.code,
            cpm: bid.cpm,
            width: bid.width,
            height: bid.height,
            creativeId: bid.creativeId,
            currency: 'USD',
            netRevenue: bid.netRevenue,
            ttl: bid.ttl,
            ad: decodeURIComponent(bid.ad.replace(/\+/g, '%20'))
          };
          bidResponses.push(bidResponse);
        };
      };
    }
    return bidResponses;
  },

  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://media.adfrontiers.com/hb/jcm_usersync.html'
      }];
    }
    if (syncOptions.image) {
      return [{
        type: 'image',
        url: 'https://media.adfrontiers.com/hb/jcm_usersync.png'
      }];
    }
  }
}

registerBidder(spec);
