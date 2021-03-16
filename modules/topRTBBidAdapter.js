import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'topRTB';
const ENDPOINT_URL = 'https://ssp.toprtb.com/ssp/rest/ReqAd?ref=www.google.com&hbid=0&adUnitId=';
var adName = '';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    if (utils.deepAccess(bid, 'mediaTypes.banner')) {
      adName = 'banner';
      return bid.params && !!bid.params.adUnitId;
    }
    if (utils.deepAccess(bid, 'mediaTypes.video')) {
      adName = 'video';
      return bid.params && !!bid.params.adUnitId;
    }
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let adunitid = [];
    utils._each(validBidRequests, function (bid) {
      adunitid.push(bid.params.adUnitId + '_' + bid.bidId);
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
          currency: response.currency,
          tracking: response.tracking,
          impression: response.impression
        };
        if (adName == 'video') {
          bidResponse.vastXml = response.mediadata;
          bidResponse.mediaType = 'video';
        } else {
          bidResponse.ad = response.mediadata;
          bidResponse.mediaType = 'banner';
        }
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  }
};

registerBidder(spec);
