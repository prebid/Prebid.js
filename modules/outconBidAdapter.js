import {registerBidder} from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'outcom';
export const spec = {
  code: BIDDER_CODE,
  aliases: ['outcom'],
  isBidRequestValid: function(bid) {
    return !!(bid.params.pod || (bid.params.internalId && bid.params.publisher));
  },

  buildRequests: function(validBidRequests) {
    let par = '';
    if (validBidRequests.params.pod != undefined) par = 'get?pod='+validBidRequests.params.pod+'&demo=true';
    else par = 'get?demo=true'+'&internalId='+validBidRequests.params.internalId+'&publisher='+validBidRequests.params.publisher;
    return {
      method: 'GET',
      url: 'http://test.outcondigital.com:8048/ad/'+par,
      data: {}
    };
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
      ttl: serverResponse.body.exp,
      ad: serverResponse.body.creatives[0].url,
      vastImpUrl: serverResponse.body.trackingURL
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },
}
registerBidder(spec);
