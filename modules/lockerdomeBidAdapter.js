import * as utils from '../src/utils';
import {BANNER} from '../src/mediaTypes';
import {registerBidder} from '../src/adapters/bidderFactory';

export const spec = {
  code: 'lockerdome',
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function(bid) {
    return !!bid.params.adUnitId;
  },
  buildRequests: function(bidRequests, bidderRequest) {
    const adUnitBidRequests = bidRequests.map(function (bid) {
      return {
        requestId: bid.bidId,
        adUnitCode: bid.adUnitCode,
        adUnitId: utils.getBidIdParameter('adUnitId', bid.params),
        sizes: bid.sizes
      }
    });
    const payload = {
      bidRequests: adUnitBidRequests,
      url: utils.getTopWindowLocation().href,
      referrer: utils.getTopWindowReferrer()
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {
        applies: bidderRequest.gdprConsent.gdprApplies,
        consent: bidderRequest.gdprConsent.consentString
      };
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: 'https://lockerdome.com/ladbid/prebid',
      data: payloadString
    };
  },
  interpretResponse: function(serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body || !serverResponse.body.bids) {
      return [];
    }
    return serverResponse.body.bids.map(function(bid) {
      return {
        requestId: bid.requestId,
        cpm: bid.cpm,
        width: bid.width,
        height: bid.height,
        creativeId: bid.creativeId,
        currency: bid.currency,
        netRevenue: bid.netRevenue,
        ad: bid.ad,
        ttl: bid.ttl
      };
    });
  },
}
registerBidder(spec);
