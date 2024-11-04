// mediaimpactBidAdapter.js

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { buildBidRequestsAndParams, postRequest, buildEndpointUrl } from '../libraries/mediaImpactUtils/index.js';

const BIDDER_CODE = 'mediaimpact';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'bidder.smartytouch.co';
export const ENDPOINT_PATH = '/hb/bid';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bidRequest) {
    return !!parseInt(bidRequest.params.unitId) || !!parseInt(bidRequest.params.partnerId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const referer = bidderRequest?.refererInfo?.page || window.location.href;

    // Use the common function to build bidRequests and beaconParams
    const { bidRequests, beaconParams } = buildBidRequestsAndParams(validBidRequests, referer);

    const adRequestUrl = buildEndpointUrl(
      ENDPOINT_PROTOCOL,
      ENDPOINT_DOMAIN,
      ENDPOINT_PATH,
      beaconParams
    );

    return {
      method: 'POST',
      url: adRequestUrl,
      data: JSON.stringify(bidRequests),
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const validBids = JSON.parse(bidRequest.data);

    if (typeof serverResponse.body === 'undefined') {
      return [];
    }

    return validBids
      .map(bid => ({ bid: bid, ad: serverResponse.body[bid.adUnitCode] }))
      .filter(item => item.ad)
      .map(item => spec.adResponse(item.bid, item.ad));
  },

  adResponse: function (bid, ad) {
    return {
      requestId: bid.bidId,
      ad: ad.ad,
      cpm: ad.cpm,
      width: ad.width,
      height: ad.height,
      ttl: 60,
      creativeId: ad.creativeId,
      netRevenue: ad.netRevenue,
      currency: ad.currency,
      winNotification: ad.winNotification,
      meta: ad.meta || {},
    };
  },

  onBidWon: function (data) {
    data.winNotification.forEach(function (unitWon) {
      const adBidWonUrl = buildEndpointUrl(
        ENDPOINT_PROTOCOL,
        ENDPOINT_DOMAIN,
        unitWon.path
      );

      if (unitWon.method === 'POST') {
        postRequest(adBidWonUrl, JSON.stringify(unitWon.data));
      }
    });

    return true;
  },
};

registerBidder(spec);
