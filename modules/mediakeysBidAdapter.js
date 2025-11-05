import {getDNT} from '../libraries/dnt/index.js';
import {
  cleanObj,
  deepAccess,
  deepClone,
  deepSetValue,
  inIframe,
  isArray,
  isEmpty,
  isFn,
  isInteger,
  isNumber,
  isPlainObject,
  isStr,
  logError,
  logWarn,
  mergeDeep,
  triggerPixel
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';

const AUCTION_TYPE = 1;
const BIDDER_CODE = 'mediakeys';
const ENDPOINT = 'https://prebid.eu-central-1.bidder.mediakeys.io/bids';
const GVLID = 498;
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
const DEFAULT_CURRENCY = 'USD';
const NET_REVENUE = true;

const NATIVE_ASSETS_MAPPING = [
  { name: 'title', id: 1, type: 0 },
  { name: 'image', id: 2, type: 3 },
  { name: 'icon', id: 3, type: 1 },
  { name: 'sponsoredBy', id: 5, type: 1 },
  { name: 'body', id: 6, type: 2 },
  { name: 'rating', id: 7, type: 3 },
  { name: 'likes', id: 8, type: 4 },
  { name: 'downloads', id: 9, type: 5 },
  { name: 'price', id: 10, type: 6 },
  { name: 'salePrice', id: 11, type: 7 },
  { name: 'phone', id: 12, type: 8 },
  { name: 'address', id: 13, type: 9 },
  { name: 'body2', id: 14, type: 10 },
  { name: 'displayUrl', id: 15, type: 11 },
  { name: 'cta', id: 16, type: 12 },
];

// This provide a whitelist and a basic validation of OpenRTB native 1.2 options.
// https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf
const ORTB_NATIVE_PARAMS = {
  context: value => [1, 2, 3].indexOf(value) !== -1,
  plcmttype: value => [1, 2, 3, 4].indexOf(value) !== -1
};

// This provide a whitelist and a basic validation of OpenRTB 2.5 video options.
// https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf
const ORTB_VIDEO_PARAMS = {
  mimes: value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string'),
  minduration: value => isInteger(value),
  maxduration: value => isInteger(value),
  protocols: value => Array.isArray(value) && value.every(v => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].indexOf(v) !== -1),
  w: value => isInteger(value),
  h: value => isInteger(value),
  startdelay: value => isInteger(value),
  placement: value => [1, 2, 3, 4, 5].indexOf(value) !== -1,
  plcmt: value => [1, 2, 3, 4].indexOf(value) !== -1,
  linearity: value => [1, 2].indexOf(value) !== -1,
  skip: value => [0, 1].indexOf(value) !== -1,
  skipmin: value => isInteger(value),
  skipafter: value => isInteger(value),
  sequence: value => isInteger(value),
  battr: value => Array.isArray(value) && value.every(v => Array.from({ length: 17 }, (_, i) => i + 1).includes(v)),
  maxextended: value => isInteger(value),
  minbitrate: value => isInteger(value),
  maxbitrate: value => isInteger(value),
  boxingallowed: value => [0, 1].indexOf(value) !== -1,
  playbackmethod: value => Array.isArray(value) && value.every(v => [1, 2, 3, 4, 5, 6].indexOf(v) !== -1),
  playbackend: value => [1, 2, 3].indexOf(value) !== -1,
  delivery: value => [1, 2, 3].indexOf(value) !== -1,
  pos: value => [0, 1, 2, 3, 4, 5, 6, 7].indexOf(value) !== -1,
  api: value => Array.isArray(value) && value.every(v => [1, 2, 3, 4, 5, 6].indexOf(v) !== -1)};

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
  if (navigator.userAgent.indexOf('Android') !== -1) return 'Android';
  if (navigator.userAgent.indexOf('like Mac') !== -1) return 'iOS';
  if (navigator.userAgent.indexOf('Win') !== -1) return 'Windows';
  if (navigator.userAgent.indexOf('Mac') !== -1) return 'Macintosh';
  if (navigator.userAgent.indexOf('Linux') !== -1) return 'Linux';
  if (navigator.appVersion.indexOf('X11') !== -1) return 'Unix';
  return 'Others';
}

/**
 * Returns floor from priceFloors module or MediaKey default value.
 *
 * @param {*} bid a Prebid.js bid (request) object
 * @param {string} mediaType the mediaType or the wildcard '*'
 * @param {string|Array} size the size array or the wildcard '*'
 * @returns {number|boolean}
 */
function getFloor(bid, mediaType, size = '*') {
  if (!isFn(bid.getFloor)) {
    return false;
  }

  if (SUPPORTED_MEDIA_TYPES.indexOf(mediaType) === -1) {
    logWarn(`${BIDDER_CODE}: Unable to detect floor price for unsupported mediaType ${mediaType}. No floor will be used.`);
    return false;
  }

  const floor = bid.getFloor({
    currency: DEFAULT_CURRENCY,
    mediaType,
    size
  })

  return (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === DEFAULT_CURRENCY) ? floor.floor : false
}

/**
 * Returns the highest floor price found when a bid have
 * several mediaTypes.
 *
 * @param {*} bid a Prebid.js bid (request) object
 * @returns {number|boolean}
 */
function getHighestFloor(bid) {
  const floors = [];

  for (const mediaType in bid.mediaTypes) {
    const floor = getFloor(bid, mediaType);

    if (isNumber(floor)) {
      floors.push(floor);
    }
  }

  if (!floors.length) {
    return false;
  }

  return floors.reduce((a, b) => {
    return Math.max(a, b);
  });
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
      dnt: getDNT(),
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
  const sizes = bid.mediaTypes.banner.sizes;
  const params = deepAccess(bid, 'params', {});

  if (!isArray(sizes) || !sizes.length) {
    logWarn(`${BIDDER_CODE}: mediaTypes.banner.size missing for adunit: ${bid.params.adUnit}. Ignoring the banner impression in the adunit.`);
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

    banner.topframe = inIframe() ? 0 : 1;
    banner.pos = params.pos || 0;

    return banner;
  }
}

/**
 * Returns an openRtb 2.5 native object with a native 1.2 request.
 *
 * @param {object} bid Prebid bid object from request
 * @returns {object}
 */
function createNativeImp(bid) {
  if (!bid.nativeParams) {
    logWarn(`${BIDDER_CODE}: bid.nativeParams object has not been found.`);
    return
  }

  const nativeParams = deepClone(bid.nativeParams);

  const nativeAdUnitParams = deepAccess(bid, 'mediaTypes.native', {});
  const nativeBidderParams = deepAccess(bid, 'params.native', {});

  const extraParams = {
    ...nativeAdUnitParams,
    ...nativeBidderParams
  };

  const nativeObject = {
    ver: '1.2',
    context: 1, // overwrited later if needed
    plcmttype: 1, // overwrited later if needed
    assets: []
  }

  Object.keys(ORTB_NATIVE_PARAMS).forEach(name => {
    if (extraParams.hasOwnProperty(name)) {
      if (ORTB_NATIVE_PARAMS[name](extraParams[name])) {
        nativeObject[name] = extraParams[name];
      } else {
        logWarn(`${BIDDER_CODE}: the OpenRTB native param ${name} has been skipped due to misformating. Please refer to OpenRTB Native spec.`);
      }
    }
  });

  // just a helper function
  const setImageAssetSizes = function(asset, param) {
    if (param.sizes && param.sizes.length) {
      asset.img.w = param.sizes ? param.sizes[0] : undefined;
      asset.img.h = param.sizes ? param.sizes[1] : undefined;
    }

    if (!asset.img.w) {
      asset.img.wmin = 0;
    }

    if (!asset.img.h) {
      asset.img.hmin = 0;
    }
  }

  // Prebid.js "image" type support.
  // Add some defaults to support special type provided by Prebid.js `mediaTypes.native.type: "image"`
  const nativeImageType = deepAccess(bid, 'mediaTypes.native.type');
  if (nativeImageType === 'image') {
    // Default value is ones of the recommended by the spec: https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf
    nativeParams.title.len = 90;
  }

  for (const key in nativeParams) {
    if (nativeParams.hasOwnProperty(key)) {
      const internalNativeAsset = ((NATIVE_ASSETS_MAPPING) || []).find(ref => ref.name === key);
      if (!internalNativeAsset) {
        logWarn(`${BIDDER_CODE}: the asset "${key}" has not been found in Prebid assets map. Skipped for request.`);
        continue;
      }

      const param = nativeParams[key];

      const asset = {
        id: internalNativeAsset.id,
        required: param.required ? 1 : 0
      }

      switch (key) {
        case 'title':
          if (param.len || param.length) {
            asset.title = {
              len: param.len || param.length,
              ext: param.ext
            }
          } else {
            logWarn(`${BIDDER_CODE}: "title.length" property for native asset is required. Skipped for request.`)
            continue;
          }
          break;

        case 'image':
          asset.img = {
            type: internalNativeAsset.type,
            mimes: param.mimes,
            ext: param.ext,
          }

          setImageAssetSizes(asset, param);

          break;
        case 'icon':
          asset.img = {
            type: internalNativeAsset.type,
            mimes: param.mimes,
            ext: param.ext,
          }

          setImageAssetSizes(asset, param);
          break;

        case 'sponsoredBy': // sponsored
        case 'body': // desc
        case 'rating':
        case 'likes':
        case 'downloads':
        case 'price':
        case 'salePrice':
        case 'phone':
        case 'address':
        case 'body2': // desc2
        case 'displayUrl':
        case 'cta':
          // generic asset.data
          asset.data = {
            type: internalNativeAsset.type,
            len: param.len,
            ext: param.ext
          }
          break;
      }

      nativeObject.assets.push(asset);
    }
  }

  if (nativeObject.assets.length) {
    return {
      request: nativeObject
    }
  }
}

/**
 * Returns an openRtb 2.5 video object.
 *
 * @param {object} bid Prebid bid object from request
 * @returns {object}
 */
function createVideoImp(bid) {
  const videoAdUnitParams = deepAccess(bid, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bid, 'params.video', {});
  const computedParams = {};

  // Special case for playerSize.
  // Eeach props will be overrided if they are defined in config.
  if (Array.isArray(videoAdUnitParams.playerSize)) {
    const tempSize = (Array.isArray(videoAdUnitParams.playerSize[0])) ? videoAdUnitParams.playerSize[0] : videoAdUnitParams.playerSize;
    computedParams.w = tempSize[0];
    computedParams.h = tempSize[1];
  }

  const videoParams = {
    ...computedParams,
    ...videoAdUnitParams,
    ...videoBidderParams
  };

  const video = {};

  // Only whitelisted OpenRTB options need to be validated.
  Object.keys(ORTB_VIDEO_PARAMS).forEach(name => {
    if (videoParams.hasOwnProperty(name)) {
      if (ORTB_VIDEO_PARAMS[name](videoParams[name])) {
        video[name] = videoParams[name];
      } else {
        logWarn(`${BIDDER_CODE}: the OpenRTB video param ${name} has been skipped due to misformating. Please refer to OpenRTB 2.5 spec.`);
      }
    }
  });

  return video;
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

  // There is no default floor. bidfloor is set only
  // if the priceFloors module is activated and returns a valid floor.
  const floor = getHighestFloor(bid);
  if (isNumber(floor)) {
    imp.bidfloor = floor;
  }

  // Only supports proper mediaTypes definition…
  for (const mediaType in bid.mediaTypes) {
    switch (mediaType) {
      case BANNER:
        const banner = createBannerImp(bid);
        if (banner) {
          imp.banner = banner;
        }
        break;
      case NATIVE:
        const native = createNativeImp(bid);
        if (native) {
          imp.native = native;
        }
        break;
      case VIDEO:
        const video = createVideoImp(bid);
        if (video) {
          imp.video = video;
        }
        break;
    }
  }

  // handle FPD for imp.
  const ortb2Imp = deepAccess(bid, 'ortb2Imp.ext.data');
  if (ortb2Imp) {
    const fpd = { ...bid.ortb2Imp };
    mergeDeep(imp, fpd);
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
  if (!cat || (isArray(cat) && !cat.length)) {
    return;
  }

  if (isArray(cat)) {
    return cat[0];
  } else if (isStr(cat)) {
    return cat;
  }
}

/**
 * Create the Prebid.js native object from response.
 *
 * @param {*} bid bid object from response
 * @returns {object} Prebid.js native object used in response
 */
function nativeBidResponseHandler(bid) {
  const nativeAdm = JSON.parse(bid.adm);
  if (!nativeAdm || !nativeAdm.assets.length) {
    logError(`${BIDDER_CODE}: invalid native response.`);
    return;
  }

  const native = {}

  nativeAdm.assets.forEach(asset => {
    if (asset.title) {
      native.title = asset.title.text;
      return;
    }

    if (asset.img) {
      switch (asset.img.type) {
        case 1:
          native.icon = {
            url: asset.img.url,
            width: asset.img.w,
            height: asset.img.h
          };
          break;
        default:
          native.image = {
            url: asset.img.url,
            width: asset.img.w,
            height: asset.img.h
          };
          break;
      }
      return;
    }

    if (asset.data) {
      const internalNativeAsset = ((NATIVE_ASSETS_MAPPING) || []).find(ref => ref.id === asset.id);
      if (internalNativeAsset) {
        native[internalNativeAsset.name] = asset.data.value;
      }
    }
  });

  if (nativeAdm.link) {
    if (nativeAdm.link.url) {
      native.clickUrl = nativeAdm.link.url;
    }
    if (Array.isArray(nativeAdm.link.clicktrackers)) {
      native.clickTrackers = nativeAdm.link.clicktrackers
    }
  }

  if (Array.isArray(nativeAdm.eventtrackers)) {
    native.impressionTrackers = [];
    nativeAdm.eventtrackers.forEach(tracker => {
      // Only Impression events are supported. Prebid does not support Viewability events yet.
      if (tracker.event !== 1) {
        return;
      }

      // methods:
      // 1: image
      // 2: js
      // note: javascriptTrackers is a string. If there's more than one JS tracker in bid response, the last script will be used.
      switch (tracker.method) {
        case 1:
          native.impressionTrackers.push(tracker.url);
          break;
        case 2:
          const script = `<script async src="${tracker.url}"></script>`;
          if (!native.javascriptTrackers) {
            native.javascriptTrackers = script;
          } else {
            native.javascriptTrackers += `\n${script}`;
          }
          break;
      }
    });
  }

  if (nativeAdm.privacy) {
    native.privacyLink = nativeAdm.privacy;
  }

  return native;
}

export const spec = {
  code: BIDDER_CODE,

  gvlid: GVLID,

  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function(bid) {
    return !!(bid && !isEmpty(bid));
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const payload = createOrtbTemplate();

    deepSetValue(payload, 'id', bidderRequest.bidderRequestId);
    deepSetValue(payload, 'source.tid', bidderRequest.ortb2.source?.tid);

    validBidRequests.forEach(validBid => {
      const bid = deepClone(validBid);

      // No additional params atm.
      const imp = createImp(bid);

      payload.imp.push(imp);
    });

    const schain = validBidRequests[0]?.ortb2?.source?.ext?.schain;
    if (schain) {
      deepSetValue(payload, 'source.ext.schain', schain);
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      deepSetValue(payload, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    if (config.getConfig('coppa') === true) {
      deepSetValue(payload, 'regs.coppa', 1);
    }

    if (deepAccess(validBidRequests[0], 'userIdAsEids')) {
      deepSetValue(payload, 'user.ext.eids', validBidRequests[0].userIdAsEids);
    }

    // Assign payload.site from refererinfo
    if (bidderRequest.refererInfo) {
      // TODO: reachedTop is probably not the right check here - it may be false when page is available or vice-versa
      if (bidderRequest.refererInfo.reachedTop) {
        deepSetValue(payload, 'site.page', bidderRequest.refererInfo.page);
        deepSetValue(payload, 'site.domain', bidderRequest.refererInfo.domain)
        if (bidderRequest.refererInfo.ref) {
          deepSetValue(payload, 'site.ref', bidderRequest.refererInfo.ref);
        }
      }
    }

    // Handle First Party Data (need publisher fpd setup)
    const fpd = bidderRequest.ortb2 || {};
    if (fpd.site) {
      mergeDeep(payload, { site: fpd.site });
    }
    if (fpd.user) {
      mergeDeep(payload, { user: fpd.user });
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
      if (serverResponse.body && serverResponse.body.seatbid && isArray(serverResponse.body.seatbid)) {
        const currency = serverResponse.body.cur || DEFAULT_CURRENCY;
        const referrer = bidRequest.site && bidRequest.site.ref ? bidRequest.site.ref : '';

        serverResponse.body.seatbid.forEach(bidderSeat => {
          if (!isArray(bidderSeat.bid) || !bidderSeat.bid.length) {
            return;
          }

          bidderSeat.bid.forEach(bid => {
            let mediaType;
            // Actually only BANNER is supported, but other types will be added soon.
            switch (deepAccess(bid, 'ext.prebid.type')) {
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
              advertiserName: deepAccess(bid, 'ext.advertiser_name', null),
              agencyName: deepAccess(bid, 'ext.agency_name', null),
              primaryCatId: getPrimaryCatFromResponse(bid.cat),
              mediaType
            };

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
              meta: cleanObj(meta)
            };

            if (mediaType === NATIVE) {
              const native = nativeBidResponseHandler(bid);
              if (native) {
                newBid.native = native;
              }
            }

            if (mediaType === VIDEO) {
              // Note:
              // Mediakeys bid adapter expects a publisher has set his own video player
              // in the `mediaTypes.video` configuration object.

              // Mediakeys bidder does not provide inline XML in the bid response
              // newBid.vastXml = bid.ext.vast_url;

              // For instream video, disable server cache as vast is generated per bid request
              newBid.videoCacheKey = 'no_cache';

              // The vast URL is server independently and must be fetched before video rendering in the renderer
              // appending '&no_cache' is safe and fast as the vast url always have parameters
              newBid.vastUrl = bid.ext.vast_url + '&no_cache';
            }

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
  }
}

registerBidder(spec)
