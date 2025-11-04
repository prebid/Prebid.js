import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
// import { logError, logInfo, logWarn, parseUrl } from '../src/utils.js';

const BIDDER_CODE = 'conceptx';
const ENDPOINT_URL = 'https://conceptx.cncpt-central.com/openrtb';
// const LOG_PREFIX = 'ConceptX: ';
const GVLID = 1340;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  gvlid: GVLID,
  isBidRequestValid: function (bid) {
    return !!(bid.bidId && bid.params.site && bid.params.adunit);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // logWarn(LOG_PREFIX + 'all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)');
    const requests = [];
    let requestUrl = `${ENDPOINT_URL}`
    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      requestUrl += '?gdpr_applies=' + bidderRequest.gdprConsent.gdprApplies;
      requestUrl += '&consentString=' + bidderRequest.gdprConsent.consentString;
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
        url: requestUrl,
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
    if (!firstBid) {
      return bidResponses
    }
    const firstSeat = firstBid.ads[0]
    if (!firstSeat) {
      return bidResponses
    }
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
