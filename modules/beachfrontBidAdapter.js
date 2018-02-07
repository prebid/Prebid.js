import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { VIDEO, BANNER } from 'src/mediaTypes';
import find from 'core-js/library/fn/array/find';

const ADAPTER_VERSION = '1.0';
const ADAPTER_NAME = 'BFIO_PREBID';

export const VIDEO_ENDPOINT = '//reachms.bfmio.com/bid.json?exchange_id=';
export const BANNER_ENDPOINT = '//display.bfmio.com/prebid_display';

export const spec = {
  code: 'beachfront',
  supportedMediaTypes: [ VIDEO, BANNER ],

  isBidRequestValid(bid) {
    return !!(bid && bid.params && bid.params.appId && bid.params.bidfloor);
  },

  buildRequests(bids) {
    let requests = [];
    let videoBids = bids.filter(bid => isVideoBid(bid));
    let bannerBids = bids.filter(bid => !isVideoBid(bid));
    videoBids.forEach(bid => {
      requests.push({
        method: 'POST',
        url: VIDEO_ENDPOINT + bid.params.appId,
        data: createVideoRequestData(bid),
        bidRequest: bid
      });
    });
    if (bannerBids.length) {
      requests.push({
        method: 'POST',
        url: BANNER_ENDPOINT,
        data: createBannerRequestData(bannerBids),
        bidRequest: bannerBids
      });
    }
    return requests;
  },

  interpretResponse(response, { bidRequest }) {
    response = response.body;

    if (isVideoBid(bidRequest)) {
      if (!response || !response.url || !response.bidPrice) {
        utils.logWarn(`No valid video bids from ${spec.code} bidder`);
        return [];
      }
      let size = getFirstSize(bidRequest);
      return {
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        vastUrl: response.url,
        cpm: response.bidPrice,
        width: size.w,
        height: size.h,
        creativeId: response.cmpId,
        mediaType: VIDEO,
        currency: 'USD',
        netRevenue: true,
        ttl: 300
      };
    } else {
      if (!response || !response.length) {
        utils.logWarn(`No valid banner bids from ${spec.code} bidder`);
        return [];
      }
      return response.map((bid) => {
        let request = find(bidRequest, req => req.adUnitCode === bid.slot);
        let size = getFirstSize(request);
        return {
          requestId: request.bidId,
          bidderCode: spec.code,
          ad: bid.adm,
          creativeId: bid.crid,
          cpm: bid.price,
          width: size.w,
          height: size.h,
          mediaType: BANNER,
          currency: 'USD',
          netRevenue: true,
          ttl: 300
        };
      });
    }
  }
};

function getSizes(bid) {
  return utils.parseSizesInput(bid.sizes).map(size => {
    let [ width, height ] = size.split('x');
    return {
      w: parseInt(width, 10) || undefined,
      h: parseInt(height, 10) || undefined
    };
  });
}

function getFirstSize(bid) {
  let sizes = getSizes(bid);
  return sizes.length ? sizes[0] : { w: undefined, h: undefined };
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent);
}

function isVideoBid(bid) {
  return bid.mediaTypes && bid.mediaTypes.video;
}

function createVideoRequestData(bid) {
  let size = getFirstSize(bid);
  let topLocation = utils.getTopWindowLocation();
  return {
    isPrebid: true,
    appId: bid.params.appId,
    domain: document.location.hostname,
    id: utils.getUniqueIdentifierStr(),
    imp: [{
      video: {
        w: size.w,
        h: size.h
      },
      bidfloor: bid.params.bidfloor
    }],
    site: {
      page: topLocation.host
    },
    device: {
      ua: global.navigator.userAgent,
      devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
      geo: {}
    },
    cur: ['USD']
  };
}

function createBannerRequestData(bids) {
  let topLocation = utils.getTopWindowLocation();
  let referrer = utils.getTopWindowReferrer();
  let slots = bids.map(bid => {
    return {
      slot: bid.adUnitCode,
      id: bid.params.appId,
      bidfloor: bid.params.bidfloor,
      sizes: getSizes(bid)
    };
  });
  return {
    slots: slots,
    page: topLocation.href,
    domain: topLocation.hostname,
    search: topLocation.search,
    referrer: referrer,
    ua: global.navigator.userAgent,
    isMobile: isMobile() ? 1 : 0,
    dnt: 0,
    adapterVersion: ADAPTER_VERSION,
    adapterName: ADAPTER_NAME
  };
}

registerBidder(spec);
