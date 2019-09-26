import {registerBidder} from '../src/adapters/bidderFactory';
import {config} from '../src/config';

const BIDDER_CODE = 'outcon';
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!((bid.params.pod || (bid.params.internalId && bid.params.publisher)) && bid.params.env);
  },
  buildRequests: function(validBidRequests) {
    for (let i = 0; i < validBidRequests.length; i++) {
      let par = '';
      let url = '';
      if (validBidRequests[i].params.pod != undefined) par = 'get?pod=' + validBidRequests[i].params.pod + '&bidId=' + validBidRequests[i].bidId;
      else par = 'get?internalId=' + validBidRequests[i].params.internalId + '&publisher=' + validBidRequests[i].params.publisher + '&bidId=' + validBidRequests[i].bidId;
      switch (validBidRequests[i].params.env) {
        case 'test':
          par = par + '&demo=true';
          url = 'http://test.outcondigital.com:8048/ad/' + par;
          break;
        case 'api':
          url = 'http://api.outcondigital.com:8048/ad/' + par;
          break;
        case 'stg':
          url = 'http://stg.outcondigital.com:8048/ad/' + par;
          break;
      }
      return {
        method: 'GET',
        url: url,
        data: {}
      };
    }
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const bidResponse = {
      requestId: serverResponse.body.bidId,
      cpm: serverResponse.body.cpm,
      width: serverResponse.body.creatives[0].width,
      height: serverResponse.body.creatives[0].height,
      creativeId: serverResponse.body.creatives[0].id,
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
