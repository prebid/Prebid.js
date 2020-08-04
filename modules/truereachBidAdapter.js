import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';

const SUPPORTED_AD_TYPES = [BANNER];
const BIDDER_CODE = 'truereach';
const BIDDER_URL = 'https://ads.momagic.com/exchange/openrtb25/';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  isBidRequestValid: function (bidRequest) {
    return (bidRequest.params.site_id && bidRequest.params.bidfloor &&
    utils.deepAccess(bidRequest, 'mediaTypes.banner') && (utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }

    let queryParams = buildCommonQueryParamsFromBids(validBidRequests, bidderRequest);

    let siteId = utils.deepAccess(validBidRequests[0], 'params.site_id');

    let url = BIDDER_URL + siteId + '?hb=1&transactionId=' + validBidRequests[0].transactionId;

    return {
      method: 'POST',
      url: url,
      data: queryParams,
      options: { withCredentials: true }
    };
  },

  interpretResponse: function ({ body: serverResponse }, serverRequest) {
    const bidResponses = [];

    if ((!serverResponse || !serverResponse.id) ||
      (!serverResponse.seatbid || serverResponse.seatbid.length === 0 || !serverResponse.seatbid[0].bid || serverResponse.seatbid[0].bid.length === 0)) {
      return bidResponses;
    }

    let adUnits = serverResponse.seatbid[0].bid;
    let bidderBid = adUnits[0];

    let responseCPM = parseFloat(bidderBid.price);
    if (responseCPM === 0) {
      return bidResponses;
    }

    let responseAd = bidderBid.adm;

    if (bidderBid.nurl) {
      let responseNurl = '<img src="' + bidderBid.nurl + '" height="0px" width="0px">';
      responseAd += responseNurl;
    }

    const bidResponse = {
      requestId: bidderBid.impid,
      cpm: responseCPM,
      currency: serverResponse.cur || 'USD',
      width: parseInt(bidderBid.w),
      height: parseInt(bidderBid.h),
      ad: decodeURIComponent(responseAd),
      ttl: 180,
      creativeId: bidderBid.crid,
      netRevenue: false
    };
    if (bidderBid.adomain && bidderBid.adomain.length) {
      bidResponse.meta = {
        advertiserDomains: bidderBid.adomain,
      };
    }

    bidResponses.push(bidResponse);

    return bidResponses;
  },

};

function buildCommonQueryParamsFromBids(validBidRequests, bidderRequest) {
  let adW = 0;
  let adH = 0;
  let adSizes = Array.isArray(validBidRequests[0].params.sizes) ? validBidRequests[0].params.sizes : validBidRequests[0].sizes;
  let sizeArrayLength = adSizes.length;
  if (sizeArrayLength === 2 && typeof adSizes[0] === 'number' && typeof adSizes[1] === 'number') {
    adW = adSizes[0];
    adH = adSizes[1];
  } else {
    adW = adSizes[0][0];
    adH = adSizes[0][1];
  }

  let bidFloor = Number(utils.deepAccess(validBidRequests[0], 'params.bidfloor'));

  let domain = window.location.host;
  let page = window.location.host + window.location.pathname + location.search + location.hash;

  let defaultParams = {
    id: utils.getUniqueIdentifierStr(),
    imp: [
      {
        id: validBidRequests[0].bidId,
        banner: {
          w: adW,
          h: adH
        },
        bidfloor: bidFloor
      }
    ],
    site: {
      domain: domain,
      page: page
    },
    device: {
      ua: window.navigator.userAgent
    },
    tmax: config.getConfig('bidderTimeout')
  };

  return defaultParams;
}

registerBidder(spec);
