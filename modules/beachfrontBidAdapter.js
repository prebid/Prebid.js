import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

export const ENDPOINT = '//reachms.bfmio.com/bid.json?exchange_id=';

export const spec = {
  code: 'beachfront',
  supportedMediaTypes: ['video'],

  isBidRequestValid(bid) {
    return !!(bid && bid.params && bid.params.appId && bid.params.bidfloor);
  },

  buildRequests(bids) {
    return bids.map(bid => {
      return {
        method: 'POST',
        url: ENDPOINT + bid.params.appId,
        data: createRequestParams(bid),
        bidRequest: bid
      };
    });
  },

  interpretResponse(response, { bidRequest }) {
    if (!response || !response.url || !response.bidPrice) {
      utils.logWarn(`No valid bids from ${spec.code} bidder`);
      return [];
    }
    let size = getSize(bidRequest.sizes);
    return {
      requestId: bidRequest.bidId,
      bidderCode: spec.code,
      cpm: response.bidPrice,
      creativeId: response.cmpId,
      vastUrl: response.url,
      width: size.width,
      height: size.height,
      mediaType: 'video',
      currency: 'USD',
      ttl: 300,
      netRevenue: true
    };
  }
};

function getSize(sizes) {
  let parsedSizes = utils.parseSizesInput(sizes);
  let [ width, height ] = parsedSizes.length ? parsedSizes[0].split('x') : [];
  return {
    width: parseInt(width, 10) || undefined,
    height: parseInt(height, 10) || undefined
  };
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent);
}

function createRequestParams(bid) {
  let size = getSize(bid.sizes);
  return {
    isPrebid: true,
    appId: bid.params.appId,
    domain: document.location.hostname,
    imp: [{
      video: {
        w: size.width,
        h: size.height
      },
      bidfloor: bid.params.bidfloor
    }],
    site: {
      page: utils.getTopWindowLocation().host
    },
    device: {
      ua: global.navigator.userAgent,
      devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2
    },
    cur: ['USD']
  };
}

registerBidder(spec);
