import {
  deepAccess,
  deepClone,
  deepSetValue,
  getWindowTop,
  inIframe,
  isArray,
  isEmpty,
  isFn,
  isNumber,
  isStr,
  logWarn,
  logError,
  logMessage,
  parseUrl,
  getBidIdParameter,
  triggerPixel,
} from '../src/utils.js';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'mediasniper';
const DEFAULT_BID_TTL = 360;
const DEFAULT_CURRENCY = 'RUB';
const DEFAULT_NET_REVENUE = true;
const ENDPOINT = 'https://sapi.bumlam.com/prebid/';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    logMessage('Hello!! bid: ', JSON.stringify(bid));

    if (!bid || isEmpty(bid)) {
      return false;
    }

    if (!bid.params || isEmpty(bid.params)) {
      return false;
    }

    if (!isStr(bid.params.placementId) && !isNumber(bid.params.placementId)) {
      return false;
    }

    const banner = deepAccess(bid, 'mediaTypes.banner', {});
    if (!banner || isEmpty(banner)) {
      return false;
    }

    const sizes = deepAccess(bid, 'mediaTypes.banner.sizes', []);
    if (!isArray(sizes) || isEmpty(sizes)) {
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const payload = createOrtbTemplate();

    deepSetValue(payload, 'id', bidderRequest.auctionId);

    validBidRequests.forEach((validBid) => {
      let bid = deepClone(validBid);

      const imp = createImp(bid);
      payload.imp.push(imp);
    });

    // params
    const siteId = getBidIdParameter('siteid', validBidRequests[0].params) + '';
    deepSetValue(payload, 'site.id', siteId);

    // Assign payload.site from refererinfo
    if (bidderRequest.refererInfo) {
      if (bidderRequest.refererInfo.reachedTop) {
        const sitePage = bidderRequest.refererInfo.referer;
        deepSetValue(payload, 'site.page', sitePage);
        deepSetValue(
          payload,
          'site.domain',
          parseUrl(sitePage, {
            noDecodeWholeURL: true,
          }).hostname
        );

        if (canAccessTopWindow()) {
          deepSetValue(payload, 'site.ref', getWindowTop().document.referrer);
        }
      }
    }

    const request = {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(payload),
    };

    return request;
  },

  interpretResponse(serverResponse, bidRequest) {
    const bidResponses = [];

    try {
      if (
        serverResponse.body &&
        serverResponse.body.seatbid &&
        isArray(serverResponse.body.seatbid)
      ) {
        serverResponse.body.seatbid.forEach((bidderSeat) => {
          if (!isArray(bidderSeat.bid) || !bidderSeat.bid.length) {
            return;
          }

          bidderSeat.bid.forEach((bid) => {
            const newBid = {
              requestId: bid.impid,
              bidderCode: spec.code,
              cpm: bid.price || 0,
              width: bid.w,
              height: bid.h,
              creativeId: bid.crid || bid.adid || bid.id,
              dealId: bid.dealid || null,
              currency: serverResponse.body.cur || DEFAULT_CURRENCY,
              netRevenue: DEFAULT_NET_REVENUE,
              ttl: DEFAULT_BID_TTL, // seconds. https://docs.prebid.org/dev-docs/faq.html#does-prebidjs-cache-bids
              ad: bid.adm,
              mediaType: BANNER,
              burl: bid.nurl,
              meta: {
                advertiserDomains:
                  Array.isArray(bid.adomain) && bid.adomain.length
                    ? bid.adomain
                    : [],
                mediaType: BANNER,
              },
            };

            logMessage('answer: ', JSON.stringify(newBid));

            bidResponses.push(newBid);
          });
        });
      }
    } catch (e) {
      logError(BIDDER_CODE, e);
    }

    return bidResponses;
  },

  onBidWon: function (bid) {
    if (!bid.burl) {
      return;
    }

    const url = bid.burl.replace(/\$\{AUCTION_PRICE\}/, bid.cpm);

    triggerPixel(url);
  },
};
registerBidder(spec);

/**
 * Detects the capability to reach window.top.
 *
 * @returns {boolean}
 */
function canAccessTopWindow() {
  try {
    return !!getWindowTop().location.href;
  } catch (error) {
    return false;
  }
}

/**
 * Returns an openRTB 2.5 object.
 * This one will be populated at each step of the buildRequest process.
 *
 * @returns {object}
 */
function createOrtbTemplate() {
  return {
    id: '',
    cur: [DEFAULT_CURRENCY],
    imp: [],
    site: {},
    device: {
      ip: '',
      js: 1,
      ua: navigator.userAgent,
    },
    user: {},
  };
}

/**
 * Create the OpenRTB 2.5 imp object.
 *
 * @param {*} bid Prebid bid object from request
 * @returns
 */
function createImp(bid) {
  let placementId = '';
  if (isStr(bid.params.placementId)) {
    placementId = bid.params.placementId;
  } else if (isNumber(bid.params.placementId)) {
    placementId = bid.params.placementId.toString();
  }

  const imp = {
    id: bid.bidId,
    tagid: placementId,
    bidfloorcur: DEFAULT_CURRENCY,
    secure: 1,
  };

  // There is no default floor. bidfloor is set only
  // if the priceFloors module is activated and returns a valid floor.
  const floor = getMinFloor(bid);
  if (isNumber(floor)) {
    imp.bidfloor = floor;
  }

  // Only supports proper mediaTypes definition…
  for (let mediaType in bid.mediaTypes) {
    switch (mediaType) {
      case BANNER:
        imp.banner = createBannerImp(bid);
        break;
    }
  }

  // dealid
  const dealId = getBidIdParameter('dealid', bid.params);
  if (dealId) {
    imp.pmp = {
      private_auction: 1,
      deals: [
        {
          id: dealId,
          bidfloor: floor || 0,
          bidfloorcur: DEFAULT_CURRENCY,
        },
      ],
    };
  }

  return imp;
}

/**
 * Returns floor from priceFloors module or MediaKey default value.
 *
 * @param {*} bid a Prebid.js bid (request) object
 * @param {string} mediaType the mediaType or the wildcard '*'
 * @param {string|array} size the size array or the wildcard '*'
 * @returns {number|boolean}
 */
function getFloor(bid, mediaType, size = '*') {
  if (!isFn(bid.getFloor)) {
    return false;
  }

  if (spec.supportedMediaTypes.indexOf(mediaType) === -1) {
    logWarn(
      `${BIDDER_CODE}: Unable to detect floor price for unsupported mediaType ${mediaType}. No floor will be used.`
    );
    return false;
  }

  const floor = bid.getFloor({
    currency: DEFAULT_CURRENCY,
    mediaType,
    size,
  });

  return !isNaN(floor.floor) && floor.currency === DEFAULT_CURRENCY
    ? floor.floor
    : false;
}

function getMinFloor(bid) {
  const floors = [];

  for (let mediaType in bid.mediaTypes) {
    const floor = getFloor(bid, mediaType);

    if (isNumber(floor)) {
      floors.push(floor);
    }
  }

  if (!floors.length) {
    return false;
  }

  return floors.reduce((a, b) => {
    return Math.min(a, b);
  });
}

/**
 * Returns an openRtb 2.5 banner object.
 *
 * @param {object} bid Prebid bid object from request
 * @returns {object}
 */
function createBannerImp(bid) {
  let sizes = bid.mediaTypes.banner.sizes;
  const params = deepAccess(bid, 'params', {});

  const banner = {};

  banner.w = parseInt(sizes[0][0], 10);
  banner.h = parseInt(sizes[0][1], 10);

  const format = [];
  sizes.forEach(function (size) {
    if (size.length && size.length > 1) {
      format.push({ w: size[0], h: size[1] });
    }
  });
  banner.format = format;

  banner.topframe = inIframe() ? 0 : 1;
  banner.pos = params.pos || 0;

  return banner;
}
