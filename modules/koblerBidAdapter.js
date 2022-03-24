import { deepAccess, isStr, replaceAuctionPrice, triggerPixel, isArray, parseQueryStringParameters, getWindowSelf } from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {getRefererInfo} from '../src/refererDetection.js';

const BIDDER_CODE = 'kobler';
const BIDDER_ENDPOINT = 'https://bid.essrtb.com/bid/prebid_rtb_call';
const TIMEOUT_NOTIFICATION_ENDPOINT = 'https://bid.essrtb.com/notify/prebid_timeout';
const SUPPORTED_CURRENCY = 'USD';
const DEFAULT_TIMEOUT = 1000;
const TIME_TO_LIVE_IN_SECONDS = 10 * 60;

export const isBidRequestValid = function (bid) {
  return !!(bid && bid.bidId && bid.params && bid.params.placementId);
};

export const buildRequests = function (validBidRequests, bidderRequest) {
  return {
    method: 'POST',
    url: BIDDER_ENDPOINT,
    data: buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest),
    options: {
      contentType: 'application/json'
    }
  };
};

export const interpretResponse = function (serverResponse) {
  const adServerPriceCurrency = config.getConfig('currency.adServerCurrency') || SUPPORTED_CURRENCY;
  const res = serverResponse.body;
  const bids = []
  if (res) {
    res.seatbid.forEach(sb => {
      sb.bid.forEach(b => {
        const adWithCorrectCurrency = b.adm
          .replace(/\${AUCTION_PRICE_CURRENCY}/g, adServerPriceCurrency);
        bids.push({
          requestId: b.impid,
          cpm: b.price,
          currency: res.cur,
          width: b.w,
          height: b.h,
          creativeId: b.crid,
          dealId: b.dealid,
          netRevenue: true,
          ttl: TIME_TO_LIVE_IN_SECONDS,
          ad: adWithCorrectCurrency,
          nurl: b.nurl,
          meta: {
            advertiserDomains: b.adomain
          }
        })
      })
    });
  }
  return bids;
};

export const onBidWon = function (bid) {
  const cpm = bid.cpm || 0;
  const cpmCurrency = bid.currency || SUPPORTED_CURRENCY;
  const adServerPrice = deepAccess(bid, 'adserverTargeting.hb_pb', 0);
  const adServerPriceCurrency = config.getConfig('currency.adServerCurrency') || SUPPORTED_CURRENCY;
  if (isStr(bid.nurl) && bid.nurl !== '') {
    const winNotificationUrl = replaceAuctionPrice(bid.nurl, bid.originalCpm || cpm)
      .replace(/\${AUCTION_PRICE_CURRENCY}/g, cpmCurrency)
      .replace(/\${AD_SERVER_PRICE}/g, adServerPrice)
      .replace(/\${AD_SERVER_PRICE_CURRENCY}/g, adServerPriceCurrency);
    triggerPixel(winNotificationUrl);
  }
};

export const onTimeout = function (timeoutDataArray) {
  if (isArray(timeoutDataArray)) {
    const refererInfo = getRefererInfo();
    const pageUrl = (refererInfo && refererInfo.referer)
      ? refererInfo.referer
      : window.location.href;
    timeoutDataArray.forEach(timeoutData => {
      const query = parseQueryStringParameters({
        ad_unit_code: timeoutData.adUnitCode,
        auction_id: timeoutData.auctionId,
        bid_id: timeoutData.bidId,
        timeout: timeoutData.timeout,
        placement_id: deepAccess(timeoutData, 'params.0.placementId'),
        page_url: pageUrl,
      });
      const timeoutNotificationUrl = `${TIMEOUT_NOTIFICATION_ENDPOINT}?${query}`;
      triggerPixel(timeoutNotificationUrl);
    });
  }
};

function buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest) {
  const imps = validBidRequests.map(buildOpenRtbImpObject);
  const timeout = bidderRequest.timeout || config.getConfig('bidderTimeout') || DEFAULT_TIMEOUT;
  const pageUrl = (bidderRequest.refererInfo && bidderRequest.refererInfo.referer)
    ? bidderRequest.refererInfo.referer
    : window.location.href;

  const request = {
    id: bidderRequest.auctionId,
    at: 1,
    tmax: timeout,
    cur: [SUPPORTED_CURRENCY],
    imp: imps,
    device: {
      devicetype: getDevice(),
      geo: getGeo(validBidRequests[0])
    },
    site: {
      page: pageUrl,
    },
    test: getTest(validBidRequests[0])
  };

  return JSON.stringify(request);
}

function buildOpenRtbImpObject(validBidRequest) {
  const sizes = getSizes(validBidRequest);
  const mainSize = sizes[0];
  const floorInfo = getFloorInfo(validBidRequest, mainSize);

  return {
    id: validBidRequest.bidId,
    banner: {
      format: buildFormatArray(sizes),
      w: mainSize[0],
      h: mainSize[1],
      ext: {
        kobler: {
          pos: getPosition(validBidRequest)
        }
      }
    },
    tagid: validBidRequest.params.placementId,
    bidfloor: floorInfo.floor,
    bidfloorcur: floorInfo.currency,
    pmp: buildPmpObject(validBidRequest)
  };
}

function getDevice() {
  const ws = getWindowSelf();
  const ua = ws.navigator.userAgent;

  if (/(tablet|ipad|playbook|silk|android 3.0|xoom|sch-i800|kindle)|(android(?!.*mobi))/i
    .test(ua.toLowerCase())) {
    return 5; // tablet
  }
  if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series([46])0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i
    .test(ua.toLowerCase())) {
    return 4; // phone
  }
  return 2; // personal computers
}

function getGeo(validBidRequest) {
  if (validBidRequest.params.zip) {
    return {
      zip: validBidRequest.params.zip
    };
  }
  return {};
}

function getTest(validBidRequest) {
  return validBidRequest.params.test ? 1 : 0;
}

function getSizes(validBidRequest) {
  const sizes = deepAccess(validBidRequest, 'mediaTypes.banner.sizes', validBidRequest.sizes);
  if (isArray(sizes) && sizes.length > 0) {
    return sizes;
  }

  return [[0, 0]];
}

function buildFormatArray(sizes) {
  return sizes.map(size => {
    return {
      w: size[0],
      h: size[1]
    };
  });
}

function getPosition(validBidRequest) {
  return parseInt(validBidRequest.params.position) || 0;
}

function getFloorInfo(validBidRequest, mainSize) {
  if (typeof validBidRequest.getFloor === 'function') {
    const sizeParam = mainSize[0] === 0 && mainSize[1] === 0 ? '*' : mainSize;
    return validBidRequest.getFloor({
      currency: SUPPORTED_CURRENCY,
      mediaType: BANNER,
      size: sizeParam
    });
  } else {
    return {
      currency: SUPPORTED_CURRENCY,
      floor: getFloorPrice(validBidRequest)
    };
  }
}

function getFloorPrice(validBidRequest) {
  return parseFloat(validBidRequest.params.floorPrice) || 0.0;
}

function buildPmpObject(validBidRequest) {
  if (validBidRequest.params.dealIds) {
    return {
      deals: validBidRequest.params.dealIds.map(dealId => {
        return {
          id: dealId
        };
      })
    };
  }
  return {};
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
  onTimeout
};

registerBidder(spec);
