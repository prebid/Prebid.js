import {registerBidder} from '../src/adapters/bidderFactory';
import {config} from '../src/config';
const BIDDER_CODE = 'outcon';
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!(bid.params.pod || (bid.params.internalId && bid.params.publisher));
  },
  buildRequests: function(validBidRequests) {
    for (let i=0; i<validBidRequests.length; i++) {
      let par = '';
      if (validBidRequests[i].params.pod != undefined) par = 'get?pod=' + validBidRequests[i].params.pod;
      else par = 'get?internalId=' + validBidRequests[i].params.internalId + '&publisher=' + validBidRequests[i].params.publisher;
      if (validBidRequests[i].params.demo == true) par = par + '&demo=true';
      return {
        method: 'GET',
        url: 'http://test.outcondigital.com:8048/ad/' + par,
        data: {}
      };
    }
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const bidResponse = {
      requestId: serverResponse.body.id,
      cpm: serverResponse.body.cpm,
      width: serverResponse.body.creatives[0].width,
      height: serverResponse.body.creatives[0].height,
      creativeId: serverResponse.body.id,
      currency: serverResponse.body.cur,
      netRevenue: true,
      ttl: config.getConfig('_bidderTimeout'),
      ad: serverResponse.body.creatives[0].url,
      vastImpUrl: serverResponse.body.trackingURL
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },
}
registerBidder(spec);
