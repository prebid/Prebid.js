import { registerBidder } from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'pubx';
const BID_ENDPOINT = 'https://api.primecaster.net/adlogue/api/slot/bid';
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (!(bid.params.sid)) {
      return false;
    } else { return true }
  },
  buildRequests: function(validBidRequests) {
    return validBidRequests.map(bidRequest => {
      const bidId = bidRequest.bidId;
      const params = bidRequest.params;
      const sid = params.sid;
      const payload = {
        sid: sid
      };
      return {
        id: bidId,
        method: 'GET',
        url: BID_ENDPOINT,
        data: payload,
      }
    });
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const body = serverResponse.body;
    const bidResponses = [];
    if (body.cid) {
      const bidResponse = {
        requestId: bidRequest.id,
        cpm: body.cpm,
        currency: body.currency,
        width: body.width,
        height: body.height,
        creativeId: body.cid,
        netRevenue: true,
        ttl: body.TTL,
        ad: body.adm
      };
      bidResponses.push(bidResponse);
    } else {};
    return bidResponses;
  }
}
registerBidder(spec);
