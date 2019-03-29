import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'toprtb';
const ENDPOINT_URL = 'http://192.168.1.5:6091/ssp/rest/ReqAd?ref=www.google.com&hbid=1&adUnitId=';
export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bid) {
    return bid.params && !!bid.params.adUnitId;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let adunitid = [];
    utils._each(validBidRequests, function (bid) {
      adunitid.push(bid.params.adUnitId + '_' + bid.bidId);
      // console.log('adunitid = ' + adunitid[0]);
    });

    return {
      method: 'GET',
      url: ENDPOINT_URL + adunitid.toString()
    };
  },

  interpretResponse: function(serverResponses, request) {
    const bidResponses = [];
    utils._each(serverResponses.body, function(response) {
      if (response.cpm > 0) {
        const bidResponse = {
          requestId: response.bidId,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          ad: response.mediadata,
          ttl: response.ttl,
          creativeId: response.id,
          netRevenue: true,
          currency: response.currency
        };
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  }
};

registerBidder(spec);
