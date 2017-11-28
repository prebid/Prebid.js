/**
 * Adapter to send bids to Undertone
 */

import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'undertone';
const URL = '//hb.undertone.com/hb';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (bid && bid.params && bid.params.publisherId && bid.params.placementId) {
      bid.params.publisherId = parseInt(bid.params.publisherId);
      return true;
    }
  },
  buildRequests: function(validBidRequests) {
    const payload = {
      'x-ut-hb-params': []
    };
    const host = utils.getTopWindowLocation().host;
    const domain = /[-\w]+\.(?:[-\w]+\.xn--[-\w]+|[-\w]{3,}|[-\w]+\.[-\w]{2})$/i.exec(host);

    const pubid = validBidRequests[0].params.publisherId;
    const REQ_URL = `${URL}?pid=${pubid}&domain=${domain}`;

    validBidRequests.map(bidReq => {
      const bid = {
        bidRequestId: bidReq.bidId,
        hbadaptor: 'prebid',
        domain: domain,
        placementId: bidReq.params.placementId,
        publisherId: bidReq.params.publisherId,
        sizes: bidReq.sizes,
        params: bidReq.params
      };
      payload['x-ut-hb-params'].push(bid);
    });
    return {
      method: 'POST',
      url: REQ_URL,
      withCredentials: true,
      data: JSON.stringify(payload)
    };
  },
  interpretResponse: function(serverResponse, request) {
    const bids = [];
    const body = serverResponse.body;

    if (body && Array.isArray(body) && body.length > 0) {
      body.forEach((bidRes) => {
        if (bidRes.ad && bidRes.cpm > 0) {
          const bid = {
            requestId: bidRes.bidRequestId,
            cpm: bidRes.cpm,
            width: bidRes.width,
            height: bidRes.height,
            creativeId: bidRes.adId,
            currency: bidRes.currency,
            netRevenue: bidRes.netRevenue,
            ttl: bidRes.ttl,
            ad: bidRes.ad
          };
          bids.push(bid);
        }
      });
    }
    return bids;
  }
};
registerBidder(spec);
