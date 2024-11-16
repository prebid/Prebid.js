// adpartnerBidAdapter.js

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { buildBidRequestsAndParams, postRequest, buildEndpointUrl, getUserSyncs } from '../libraries/mediaImpactUtils/index.js';

const BIDDER_CODE = 'adpartner';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'a4p.adpartner.pro';
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

    const adPartnerRequestUrl = buildEndpointUrl(
      ENDPOINT_PROTOCOL,
      ENDPOINT_DOMAIN,
      ENDPOINT_PATH,
      beaconParams
    );

    return {
      method: 'POST',
      url: adPartnerRequestUrl,
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
    const bidObject = {
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
      meta: ad.adomain && ad.adomain.length > 0 ? { advertiserDomains: ad.adomain } : {},
    };

    return bidObject;
  },

  onBidWon: function (data) {
    data.winNotification.forEach(function (unitWon) {
      const adPartnerBidWonUrl = buildEndpointUrl(
        ENDPOINT_PROTOCOL,
        ENDPOINT_DOMAIN,
        unitWon.path
      );

      if (unitWon.method === 'POST') {
        postRequest(adPartnerBidWonUrl, JSON.stringify(unitWon.data));
      }
    });

    return true;
  },

  getUserSyncs: getUserSyncs()
};

registerBidder(spec);
