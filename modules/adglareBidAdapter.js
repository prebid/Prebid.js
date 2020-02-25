'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adglare';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function (bid) {
    let p = bid.params;
    if (typeof p.domain === 'string' && !!p.domain.length && p.zID && !isNaN(p.zID) && p.type == 'banner') return true;
    return false;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    let i;
    let j;
    let bidRequest;
    let zID;
    let domain;
    let keywords;
    let url;
    let type;
    let availscreen = window.innerWidth + 'x' + window.innerHeight;
    let pixelRatio = window.devicePixelRatio || 1;
    let screen = (pixelRatio * window.screen.width) + 'x' + (pixelRatio * window.screen.height);
    let sizes = [];
    let serverRequests = [];
    let timeout = bidderRequest.timeout || 0;
    let referer = bidderRequest.refererInfo.referer || '';
    let reachedtop = bidderRequest.refererInfo.reachedTop || '';
    for (i = 0; i < validBidRequests.length; i++) {
      bidRequest = validBidRequests[i];
      zID = bidRequest.params.zID;
      domain = bidRequest.params.domain;
      keywords = bidRequest.params.keywords || '';
      type = bidRequest.params.type;

      // Build ad unit sizes
      if (bidRequest.mediaTypes && bidRequest.mediaTypes[type]) {
        for (j in bidRequest.mediaTypes[type].sizes) {
          sizes.push(bidRequest.mediaTypes[type].sizes[j].join('x'));
        }
      }

      // Build URL
      url = 'https://' + domain + '/?' + encodeURIComponent(zID) + '&pbjs&pbjs_version=1';
      url += '&pbjs_type=' + encodeURIComponent(type);
      url += '&pbjs_timeout=' + encodeURIComponent(timeout);
      url += '&pbjs_reachedtop=' + encodeURIComponent(reachedtop);
      url += '&sizes=' + encodeURIComponent(sizes.join(','));
      url += '&screen=' + encodeURIComponent(screen);
      url += '&availscreen=' + encodeURIComponent(availscreen);
      url += '&referer=' + encodeURIComponent(referer);
      if (keywords !== '') {
        url += '&keywords=' + encodeURIComponent(keywords);
      }

      // Push server request
      serverRequests.push({
        method: 'GET',
        url: url,
        data: {},
        bidRequest: bidRequest
      });
    }
    return serverRequests;
  },
  interpretResponse: function (serverResponse, request) {
    const bidObj = request.bidRequest;
    let bidResponses = [];
    let bidResponse = {};
    serverResponse = serverResponse.body;

    if (serverResponse && serverResponse.status == 'OK' && bidObj) {
      bidResponse.requestId = bidObj.bidId;
      bidResponse.bidderCode = bidObj.bidder;
      bidResponse.cpm = serverResponse.cpm;
      bidResponse.width = serverResponse.width;
      bidResponse.height = serverResponse.height;
      bidResponse.ad = serverResponse.adhtml;
      bidResponse.ttl = serverResponse.ttl;
      bidResponse.creativeId = serverResponse.crID;
      bidResponse.netRevenue = true;
      bidResponse.currency = serverResponse.currency;
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },
};
registerBidder(spec);
