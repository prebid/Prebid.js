import { registerBidder } from '../src/adapters/bidderFactory.js';
import includes from 'core-js-pure/features/array/includes.js';
import { BANNER } from '../src/mediaTypes.js';

const VERSION = '1.0';

export const spec = {
  code: 'adhash',
  url: 'https://bidder.adhash.org/rtb?version=' + VERSION + '&prebid=true',
  supportedMediaTypes: [ BANNER ],

  isBidRequestValid: (bid) => {
    try {
      const { publisherId, platformURL } = bid.params;
      return (
        includes(Object.keys(bid.mediaTypes), BANNER) &&
        typeof publisherId === 'string' &&
        publisherId.length === 42 &&
        typeof platformURL === 'string' &&
        platformURL.length >= 13
      );
    } catch (error) {
      return false;
    }
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const { gdprConsent } = bidderRequest;
    const { url } = spec;
    const bidRequests = [];
    let referrer = '';
    if (bidderRequest && bidderRequest.refererInfo) {
      referrer = bidderRequest.refererInfo.referer;
    }
    for (var i = 0; i < validBidRequests.length; i++) {
      var index = Math.floor(Math.random() * validBidRequests[i].sizes.length);
      var size = validBidRequests[i].sizes[index].join('x');
      bidRequests.push({
        method: 'POST',
        url: url,
        bidRequest: validBidRequests[i],
        data: {
          timezone: new Date().getTimezoneOffset() / 60,
          location: referrer,
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
            size: size,
            position: validBidRequests[i].adUnitCode
          }],
          blockedCreatives: [],
          currentTimestamp: new Date().getTime(),
          recentAds: [],
          GDPR: gdprConsent
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

    if (!responseBody.creatives || responseBody.creatives.length === 0) {
      return [];
    }

    const publisherURL = JSON.stringify(request.bidRequest.params.platformURL);
    const oneTimeId = request.bidRequest.adUnitCode + Math.random().toFixed(16).replace('0.', '.');
    const bidderResponse = JSON.stringify({ responseText: JSON.stringify(responseBody) });
    const requestData = JSON.stringify(request.data);

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
      ttl: 60,
      meta: {
        advertiserDomains: responseBody.advertiserDomains ? [responseBody.advertiserDomains] : []
      }
    }];
  }
};

registerBidder(spec);
