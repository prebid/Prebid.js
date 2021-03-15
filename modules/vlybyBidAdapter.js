import { registerBidder } from '../src/adapters/bidderFactory.js'

import { BANNER, VIDEO } from '../src/mediaTypes.js'
import { config } from '../src/config.js';

const ENDPOINT = '//europe-west3-vlybypoc2019.cloudfunctions.net/prebid';
const BIDDER_CODE = 'vlyby';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: function (bid) {
    if (bid && bid.params && bid.params.publisherId && bid.params.siteId) {
      return true
    }
    return false
  },

  buildRequests: function (validBidRequests, bidderRequest = {}) {
    const refererInfo = bidderRequest.refererInfo || {};
    const gdprConsent = bidderRequest.gdprConsent || {};
    const publisherDomain = config.getConfig('publisherDomain');
    return {
      method: 'POST',
      url: `${ENDPOINT}`,
      data: {
        pubDomain: publisherDomain,
        auctionId: bidderRequest.auctionId,
        refererInfo: {
          isAmp: refererInfo.isAmp,
          numIframes: refererInfo.numIframes,
          reachedTop: refererInfo.reachedTop,
          referer: refererInfo.referer
        },
        gdprConsent: {
          consentString: gdprConsent.consentString,
          gdprApplies: gdprConsent.gdprApplies
        },
        bidRequests: validBidRequests.map(({ params, sizes, bidId, adUnitCode }) => ({
          bidId,
          adUnitCode,
          params,
          sizes
        }))
      },
      options: {
        withCredentials: false,
        contentType: 'application/json'
      },
      validBidRequests: validBidRequests,
    }
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    if (serverResponse.body) {
      const vHB = serverResponse.body.bids;
      try {
        let bidResponse = {
          requestId: vHB.bid,
          cpm: vHB.cpm,
          width: vHB.size.width,
          height: vHB.size.height,
          creativeId: vHB.creative.id,
          currency: 'EUR',
          netRevenue: true,
          ttl: 360,
          ad: vHB.creative.ad
        };
        bidResponses.push(bidResponse);
      } catch(e) { }
    }
    return bidResponses;
  }
};
registerBidder(spec);
