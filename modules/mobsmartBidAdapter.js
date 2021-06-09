import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'mobsmart';
const ENDPOINT = 'https://prebid.mobsmart.net/prebid/endpoint';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (bid.bidder !== BIDDER_CODE) {
      return false;
    }

    return true;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const timeout = config.getConfig('bidderTimeout');
    const referrer = encodeURIComponent(bidderRequest.refererInfo.referer);

    return validBidRequests.map(bidRequest => {
      const adUnit = {
        code: bidRequest.adUnitCode,
        bids: {
          bidder: bidRequest.bidder,
          params: bidRequest.params
        },
        mediaTypes: bidRequest.mediaTypes
      };

      if (bidRequest.hasOwnProperty('sizes') && bidRequest.sizes.length > 0) {
        adUnit.sizes = bidRequest.sizes;
      }

      const request = {
        auctionId: bidRequest.auctionId,
        requestId: bidRequest.bidId,
        bidRequestsCount: bidRequest.bidRequestsCount,
        bidderRequestId: bidRequest.bidderRequestId,
        transactionId: bidRequest.transactionId,
        referrer: referrer,
        timeout: timeout,
        adUnit: adUnit
      };

      if (bidRequest.userId && bidRequest.userId.pubcid) {
        request.userId = {pubcid: bidRequest.userId.pubcid};
      }

      return {
        method: 'POST',
        url: ENDPOINT,
        data: JSON.stringify(request)
      }
    });
  },
  interpretResponse: function(serverResponse) {
    const bidResponses = [];

    if (serverResponse.body) {
      const response = serverResponse.body;
      const bidResponse = {
        requestId: response.requestId,
        cpm: response.cpm,
        width: response.width,
        height: response.height,
        creativeId: response.creativeId,
        currency: response.currency,
        netRevenue: response.netRevenue,
        ttl: response.ttl,
        ad: response.ad,
      };
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    let syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://tags.mobsmart.net/tags/iframe'
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: 'https://tags.mobsmart.net/tags/image'
      });
    }

    return syncs;
  }
}
registerBidder(spec);
