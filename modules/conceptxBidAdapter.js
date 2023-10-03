import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
// import { logError, logInfo, logWarn, parseUrl } from '../src/utils.js';

const BIDDER_CODE = 'conceptx';
let ENDPOINT_URL = 'https://conceptx.cncpt-central.com/openrtb';
// const LOG_PREFIX = 'ConceptX: ';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!(bid.bidId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // logWarn(LOG_PREFIX + 'all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)');
    const requests = [];

    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      ENDPOINT_URL += '?gdpr_applies=' + bidderRequest.gdprConsent.gdprApplies;
      ENDPOINT_URL += '&consentString=' + bidderRequest.gdprConsent.consentString;
    }
    for (var i = 0; i < validBidRequests.length; i++) {
      const requestParent = { adUnits: [], meta: {} };
      const bid = validBidRequests[i]
      const { adUnitCode, auctionId, bidId, bidder, bidderRequestId, ortb2 } = bid
      requestParent.meta = { adUnitCode, auctionId, bidId, bidder, bidderRequestId, ortb2 }

      const { site, adunit } = bid.params
      const adUnit = { site, adunit, targetId: bid.bidId }
      if (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) adUnit.dimensions = bid.mediaTypes.banner.sizes
      requestParent.adUnits.push(adUnit);
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL,
        options: {
          withCredentials: false,
        },
        data: JSON.stringify(requestParent),
      });
    }

    return requests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const bidResponsesFromServer = serverResponse.body.bidResponses;
    if (Array.isArray(bidResponsesFromServer) && bidResponsesFromServer.length === 0) {
      return bidResponses
    }
    const firstBid = bidResponsesFromServer[0]
    const firstSeat = firstBid.ads[0]
    const bidResponse = {
      requestId: firstSeat.requestId,
      cpm: firstSeat.cpm,
      width: firstSeat.width,
      height: firstSeat.height,
      creativeId: firstSeat.creativeId,
      dealId: firstSeat.dealId,
      currency: firstSeat.currency,
      netRevenue: true,
      ttl: firstSeat.ttl,
      referrer: firstSeat.referrer,
      ad: firstSeat.html
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },

}
registerBidder(spec);
