import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'outcon';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],
  isBidRequestValid: function(bid) {
    return !!((bid.params.pod || (bid.params.internalId && bid.params.publisher)) && bid.params.env);
  },
  buildRequests: function(validBidRequests) {
    for (let i = 0; i < validBidRequests.length; i++) {
      let url = '';
      let par = '';
      if (validBidRequests[i].params.pod != undefined) par = 'get?pod=' + validBidRequests[i].params.pod + '&bidId=' + validBidRequests[i].bidId;
      else par = 'get?internalId=' + validBidRequests[i].params.internalId + '&publisher=' + validBidRequests[i].params.publisher + '&bidId=' + validBidRequests[i].bidId;
      par = par + '&vast=true';
      switch (validBidRequests[i].params.env) {
        case 'test':
          par = par + '&demo=true';
          url = 'https://test.outcondigital.com/ad/' + par;
          break;
        case 'api':
          url = 'https://api.outcondigital.com/ad/' + par;
          break;
        case 'stg':
          url = 'https://stg.outcondigital.com/ad/' + par;
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
      ttl: 300,
      ad: wrapDisplayUrl(serverResponse.body.creatives[0].url, serverResponse.body.type),
      vastImpUrl: serverResponse.body.trackingURL,
      mediaType: serverResponse.body.type
    };
    if (serverResponse.body.type == 'video') {
      Object.assign(bidResponse, {
        vastUrl: serverResponse.body.vastURL,
        ttl: 3600
      });
    }
    bidResponses.push(bidResponse);
    return bidResponses;
  },
}

function wrapDisplayUrl(displayUrl, type) {
  if (type == 'video') return `<html><head></head><body style='margin : 0; padding: 0;'><div><video width="100%"; height="100%"; autoplay = true><source src="${displayUrl}"></video></div></body>`;
  if (type == 'banner') return `<html><head></head><body style='margin : 0; padding: 0;'><div><img width:"100%"; height:"100%"; src="${displayUrl}"></div></body>`;
  return null;
}

registerBidder(spec);
