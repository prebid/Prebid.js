import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { VIDEO, BANNER } from 'src/mediaTypes';

export const VIDEO_ENDPOINT = '//reachms.bfmio.com/bid.json?exchange_id=';
export const BANNER_ENDPOINT = '//display.beachrtb.com/bid_display?exchange_id=';

export const spec = {
  code: 'beachfront',
  supportedMediaTypes: [ VIDEO, BANNER ],

  isBidRequestValid(bid) {
    return !!(bid && bid.params && bid.params.appId && bid.params.bidfloor);
  },

  buildRequests(bids) {
    return bids.map(bid => {
      let isVideo = bid.mediaTypes && bid.mediaTypes.video;
      return {
        method: 'POST',
        url: (isVideo ? VIDEO_ENDPOINT : BANNER_ENDPOINT) + bid.params.appId,
        data: createRequestParams(bid),
        bidRequest: bid
      };
    });
  },

  interpretResponse(response, { bidRequest }) {
    response = response.body;
    if (!response || !response.url || !response.bidPrice) {
      utils.logWarn(`No valid bids from ${spec.code} bidder`);
      return [];
    }
    let size = getSize(bidRequest.sizes);
    let isVideo = bidRequest.mediaTypes && bidRequest.mediaTypes.video;
    if (isVideo) {
      return {
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        vastUrl: response.url,
        cpm: response.bidPrice,
        width: size.width,
        height: size.height,
        creativeId: response.cmpId,
        mediaType: VIDEO,
        currency: 'USD',
        netRevenue: true,
        ttl: 300
      };
    } else {
      let bids = response.seatbid[0].bid;
      return bids.map((bid) => {
        return {
          requestId: bidRequest.bidId,
          bidderCode: spec.code,
          ad: bid.adm,
          cpm: parseFloat(bid.price),
          width: parseInt(bid.w),
          height: parseInt(bid.h),
          creativeId: bid.crid,
          mediaType: BANNER,
          currency: 'USD',
          netRevenue: true,
          ttl: 300
        };
      });
    }
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
  let isVideo = bid.mediaTypes && bid.mediaTypes.video;
  return {
    isPrebid: true,
    appId: bid.params.appId,
    domain: document.location.hostname,
    id: utils.getUniqueIdentifierStr(),
    imp: [{
      [ isVideo ? VIDEO : BANNER ]: {
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
