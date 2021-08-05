import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import { createEidsArray } from './userId/eids.js';

const AUCTION_TYPE = 1;
const BIDDER_CODE = 'mediakeys';
const ENDPOINT = 'https://prebid.eu-central-1.bidder.mediakeys.io/bids';
const GVLID = 498;
const SUPPORTED_MEDIA_TYPES = [BANNER];
const DEFAULT_CURRENCY = 'USD';
const NET_REVENUE = true;

/**
 * Detects the capability to reach window.top.
 *
 * @returns {boolean}
 */
function canAccessTopWindow() {
  try {
    return !!utils.getWindowTop().location.href;
  } catch (error) {
    return false;
  }
}

/**
 * Returns the OpenRtb deviceType id detected from User Agent
 * Voluntary limited to phone, tablet, desktop.
 *
 * @returns {number}
 */
function getDeviceType() {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 5;
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 4;
  }
  return 2;
}

/**
 * Returns the OS name detected from User Agent.
 *
 * @returns {number}
 */
function getOS() {
  if (navigator.userAgent.indexOf('Android') != -1) return 'Android';
  if (navigator.userAgent.indexOf('like Mac') != -1) return 'iOS';
  if (navigator.userAgent.indexOf('Win') != -1) return 'Windows';
  if (navigator.userAgent.indexOf('Mac') != -1) return 'Macintosh';
  if (navigator.userAgent.indexOf('Linux') != -1) return 'Linux';
  if (navigator.appVersion.indexOf('X11') != -1) return 'Unix';
  return 'Others';
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
  if (!utils.isFn(bid.getFloor)) {
    return false;
  }

  if (SUPPORTED_MEDIA_TYPES.indexOf(mediaType) === -1) {
    utils.logWarn(`${BIDDER_CODE}: Unable to detect floor price for unsupported mediaType ${mediaType}. No floor will be used.`);
    return false;
  }

  const floor = bid.getFloor({
    currency: DEFAULT_CURRENCY,
    mediaType,
    size
  })

  return (!isNaN(floor.floor) && floor.currency === DEFAULT_CURRENCY) ? floor.floor : false
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
    at: AUCTION_TYPE,
    cur: [DEFAULT_CURRENCY],
    imp: [],
    site: {}, // computed in buildRequest()
    device: {
      ip: '',
      js: 1,
      dnt: utils.getDNT(),
      ua: navigator.userAgent,
      devicetype: getDeviceType(),
      os: getOS(),
      h: screen.height,
      w: screen.width,
      language: navigator.language,
      make: navigator.vendor ? navigator.vendor : ''
    },
    user: {},
    regs: {
      ext: {
        gdpr: 0 // not applied by default
      }
    },
    ext: {
      is_secure: 1
    }
  };
}

/**
 * Returns an openRtb 2.5 banner object.
 *
 * @param {object} bid Prebid bid object from request
 * @returns {object}
 */
function createBannerImp(bid) {
  let sizes = bid.mediaTypes.banner.sizes;
  const params = utils.deepAccess(bid, 'params', {});

  if (!utils.isArray(sizes) || !sizes.length) {
    utils.logWarn(`${BIDDER_CODE}: mediaTypes.banner.size missing for adunit: ${bid.params.adUnit}. Ignoring the banner impression in the adunit.`);
  } else {
    const banner = {};

    banner.w = parseInt(sizes[0][0], 10);
    banner.h = parseInt(sizes[0][1], 10);

    const format = [];
    sizes.forEach(function (size) {
      if (size.length && size.length > 1) {
        format.push({w: size[0], h: size[1]});
      }
    });
    banner.format = format;

    banner.topframe = utils.inIframe() ? 0 : 1;
    banner.pos = params.pos || 0;

    return banner;
  }
}

/**
 * Create the OpenRTB 2.5 imp object.
 *
 * @param {*} bid Prebid bid object from request
 * @returns
 */
function createImp(bid) {
  const imp = {
    id: bid.bidId,
    tagid: bid.params.adUnit || undefined,
    bidfloorcur: DEFAULT_CURRENCY,
    secure: 1,
  };

  // Only supports proper mediaTypes definition…
  for (let mediaType in bid.mediaTypes) {
    // There is no default floor. bidfloor is set only
    // if the priceFloors module is activated and returns a valid floor.
    const floor = getFloor(bid, mediaType);
    if (floor) {
      imp.bidfloor = floor;
    }

    if (mediaType === BANNER) {
      const banner = createBannerImp(bid);
      if (banner) {
        imp.banner = banner;
      }
    }
  }

  // handle FPD for imp.
  const ortb2Imp = utils.deepAccess(bid, 'ortb2Imp.ext.data');
  if (ortb2Imp) {
    const fpd = { ...bid.ortb2Imp };
    utils.mergeDeep(imp, fpd);
  }

  return imp;
}

/**
 * If array, extract the first IAB category from provided list
 * If string just return it
 *
 * @param {string|Array} cat IAB Category
 * @returns {string|null}
 */
function getPrimaryCatFromResponse(cat) {
  if (!cat || (utils.isArray(cat) && !cat.length)) {
    return;
  }

  if (utils.isArray(cat)) {
    return cat[0];
  } else if (utils.isStr(cat)) {
    return cat;
  }
}

export const spec = {
  code: BIDDER_CODE,

  gvlid: GVLID,

  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function(bid) {
    return !!(bid && !utils.isEmpty(bid));
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const payload = createOrtbTemplate();

    // Pass the auctionId as ortb2 id
    // See https://github.com/prebid/Prebid.js/issues/6563
    utils.deepSetValue(payload, 'id', bidderRequest.auctionId);
    utils.deepSetValue(payload, 'source.tid', bidderRequest.auctionId);

    validBidRequests.forEach(validBid => {
      let bid = utils.deepClone(validBid);

      // No additional params atm.
      const imp = createImp(bid);

      payload.imp.push(imp);
    });

    if (validBidRequests[0].schain) {
      utils.deepSetValue(payload, 'source.ext.schain', validBidRequests[0].schain);
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      utils.deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      utils.deepSetValue(payload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      utils.deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    if (config.getConfig('coppa') === true) {
      utils.deepSetValue(payload, 'regs.coppa', 1);
    }

    if (utils.deepAccess(validBidRequests[0], 'userId')) {
      utils.deepSetValue(payload, 'user.ext.eids', createEidsArray(validBidRequests[0].userId));
    }

    // Assign payload.site from refererinfo
    if (bidderRequest.refererInfo) {
      if (bidderRequest.refererInfo.reachedTop) {
        const sitePage = bidderRequest.refererInfo.referer;
        utils.deepSetValue(payload, 'site.page', sitePage);
        utils.deepSetValue(payload, 'site.domain', utils.parseUrl(sitePage, {
          noDecodeWholeURL: true
        }).hostname);

        if (canAccessTopWindow()) {
          utils.deepSetValue(payload, 'site.ref', utils.getWindowTop().document.referrer);
        }
      }
    }

    // Handle First Party Data (need publisher fpd setup)
    const fpd = config.getConfig('ortb2') || {};
    if (fpd.site) {
      utils.mergeDeep(payload, { site: fpd.site });
    }
    if (fpd.user) {
      utils.mergeDeep(payload, { user: fpd.user });
    }
    // Here we can handle device.geo prop
    const deviceGeo = utils.deepAccess(fpd, 'device.geo');
    if (deviceGeo) {
      utils.mergeDeep(payload.device, { geo: deviceGeo });
    }

    const request = {
      method: 'POST',
      url: ENDPOINT,
      data: payload,
      options: {
        withCredentials: false
      }
    }

    return request;
  },

  interpretResponse(serverResponse, bidRequest) {
    const bidResponses = [];

    try {
      if (serverResponse.body && serverResponse.body.seatbid && utils.isArray(serverResponse.body.seatbid)) {
        const currency = serverResponse.body.cur || DEFAULT_CURRENCY;
        const referrer = bidRequest.site && bidRequest.site.ref ? bidRequest.site.ref : '';

        serverResponse.body.seatbid.forEach(bidderSeat => {
          if (!utils.isArray(bidderSeat.bid) || !bidderSeat.bid.length) {
            return;
          }

          bidderSeat.bid.forEach(bid => {
            let mediaType;
            // Actually only BANNER is supported, but other types will be added soon.
            switch (utils.deepAccess(bid, 'ext.prebid.type')) {
              case 'V':
                mediaType = VIDEO;
                break;
              case 'N':
                mediaType = NATIVE;
                break;
              default:
                mediaType = BANNER;
            }

            const meta = {
              advertiserDomains: (Array.isArray(bid.adomain) && bid.adomain.length) ? bid.adomain : [],
              advertiserName: utils.deepAccess(bid, 'ext.advertiser_name', null),
              agencyName: utils.deepAccess(bid, 'ext.agency_name', null),
              primaryCatId: getPrimaryCatFromResponse(bid.cat),
              mediaType
            }

            const newBid = {
              requestId: bid.impid,
              cpm: (parseFloat(bid.price) || 0),
              width: bid.w,
              height: bid.h,
              creativeId: bid.crid || bid.id,
              dealId: bid.dealid || null,
              currency,
              netRevenue: NET_REVENUE,
              ttl: 360, // seconds. https://docs.prebid.org/dev-docs/faq.html#does-prebidjs-cache-bids
              referrer,
              ad: bid.adm,
              mediaType,
              burl: bid.burl,
              meta: utils.cleanObj(meta)
            };

            bidResponses.push(newBid);
          });
        });
      }
    } catch (e) {
      utils.logError(BIDDER_CODE, e);
    }

    return bidResponses;
  },

  onBidWon: function (bid) {
    if (!bid.burl) {
      return;
    }

    const url = bid.burl.replace(/\$\{AUCTION_PRICE\}/, bid.cpm);

    utils.triggerPixel(url);
  }
}

registerBidder(spec)
