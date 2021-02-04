import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

export const spec = {
  code: 'adhash',
  url: 'https://bidder.adhash.org/rtb?version=1.0&prebid=true',
  supportedMediaTypes: [ BANNER ],

  isBidRequestValid: (bid) => {
    try {
      const { publisherId, platformURL } = bid.params;
      return (
        typeof publisherId === 'string' &&
        publisherId.length === 42 &&
        typeof platformURL === 'string' &&
        platformURL.length >= 13
      );
    } catch (error) {
      return false;
    }
  },

  buildRequests: (validBidRequests, _bidderRequest) => {
    const { url } = spec;
    const bidRequests = [];
    for (var i = 0; i < validBidRequests.length; i++) {
      bidRequests.push({
        method: 'POST',
        url: url,
        bidRequest: validBidRequests[i],
        data: {
          timezone: new Date().getTimezoneOffset() / 60,
          referrer: document.referrer,
          location: window.location.href,
          publisherId: validBidRequests[i].params.publisherId,
          size: {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height
          },
          navigator: {
            platform: window.navigator.platform,
            language: window.navigator.language,
            userAgent: window.navigator.userAgent
          },
          creatives: [{
            size: validBidRequests[i].sizes[0].join('x'),
            position: validBidRequests[i].adUnitCode
          }],
          blockedCreatives: [],
          currentTimestamp: new Date().getTime(),
          recentAds: []
        },
        options: {
          withCredentials: false,
          crossOrigin: true
        },
      });
    }
    return bidRequests;
  },

  interpretResponse: (serverResponse, request) => {
    const responseBody = serverResponse ? serverResponse.body : {};
    const publisherURL = JSON.stringify(request.bidRequest.params.platformURL);
    const oneTimeId = request.bidRequest.adUnitCode + Math.random().toFixed(16).replace('0.', '.');
    const bidderResponse = JSON.stringify({ responseText: JSON.stringify(responseBody) });
    const requestData = JSON.stringify(request.data);

    if (!responseBody.creatives || responseBody.creatives.length === 0) {
      return [];
    }

    return [{
      requestId: request.bidRequest.bidId,
      cpm: responseBody.creatives[0].costEUR,
      ad:
        `<div id="${oneTimeId}"></div>
        <script src="https://bidder.adhash.org/static/scripts/creative.min.js"></script>
        <script>callAdvertiser(${bidderResponse},['${oneTimeId}'],${requestData},${publisherURL})</script>`,
      width: request.bidRequest.sizes[0][0],
      height: request.bidRequest.sizes[0][1],
      creativeId: request.bidRequest.adUnitCode,
      netRevenue: true,
      currency: 'EUR',
      ttl: 60
    }];
  }
};

registerBidder(spec);
