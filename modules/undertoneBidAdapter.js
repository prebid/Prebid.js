/**
 * Adapter to send bids to Undertone
 * @returns {{callBids: _callBids}}
 */

import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'undertone';
const URL = '//localhost:9090/hb';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (bid && bid.params && bid.params.publisherId) {
      return true;
    }
  },
  buildRequests: function(validBidRequests) {
    const payload = [];
    validBidRequests.map(bidReq => {
      const bid = {
        bidRequestId: bidReq.bidId,
        domain: utils.getTopWindowLocation() || '',
        placementId: bidReq.params.placementId || 0,
        publisherId: bidReq.params.publisherId,
        sizes: bidReq.sizes,
        params: bidReq.params
      };
      payload.push(bid);
    });
    console.log(payload);
    return {
      method: 'POST',
      url: URL,
      data: payload
    };
  },
  interpretResponse: function(serverResponse, request) {
    const bids = [];
    if (!serverResponse || serverResponse.error) {
      if (serverResponse.error) {
        utils.logError('undertone: ', serverResponse.error);
      }
      return bids;
    }

    serverResponse.forEach((bidRes) => {
      const bid = {
        requestId: bidRes.bidRequestId,
        bidderCode: BIDDER_CODE,
        cpm: bidRes.cpm,
        width: bidRes.width,
        height: bidRes.height,
        creativeId: bidRes.creativeId,
        currency: bidRes.currency,
        netRevenue: bidRes.netRevenue,
        ttl: bidRes.ttl,
        ad: bidRes.ad
      };
      bids.push(bid);
    });
    return bids;
  },
  getUserSyncs: function(syncOptions) {}
};
registerBidder(spec);
