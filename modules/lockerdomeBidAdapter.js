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
    let schain;

    const adUnitBidRequests = bidRequests.map(function (bid) {
      if (bid.schain) schain = schain || bid.schain;
      return {
        requestId: bid.bidId,
        adUnitCode: bid.adUnitCode,
        adUnitId: utils.getBidIdParameter('adUnitId', bid.params),
        sizes: bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes
      };
    });

    const bidderRequestCanonicalUrl = (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.canonicalUrl) || '';
    const bidderRequestReferer = (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) || '';
    const payload = {
      bidRequests: adUnitBidRequests,
      url: encodeURIComponent(bidderRequestCanonicalUrl),
      referrer: encodeURIComponent(bidderRequestReferer)
    };
    if (schain) {
      payload.schain = schain;
    }
    if (bidderRequest) {
      if (bidderRequest.gdprConsent) {
        payload.gdpr = {
          applies: bidderRequest.gdprConsent.gdprApplies,
          consent: bidderRequest.gdprConsent.consentString
        };
      }
      if (bidderRequest.uspConsent) {
        payload.us_privacy = {
          consent: bidderRequest.uspConsent
        }
      }
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
};
registerBidder(spec);
