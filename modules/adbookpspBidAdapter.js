import includes from 'core-js-pure/features/array/includes.js';
import find from 'core-js-pure/features/array/find';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

/**
 * CONSTANTS
 */

export const VERSION = '1.0.0';
const EXCHANGE_URL = 'https://ex.fattail.com/openrtb2';
const WIN_TRACKING_URL = 'https://ev.fattail.com/wins';
const BIDDER_CODE = 'adbookpsp';
const USER_ID_KEY = 'hb_adbookpsp_uid';
const USER_ID_COOKIE_EXP = 2592000000; // lasts 30 days
const BID_TTL = 300;
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO];
const DEFAULT_CURRENCY = 'USD';
const VIDEO_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'protocols',
  'w',
  'h',
  'startdelay',
  'placement',
  'linearity',
  'skip',
  'skipmin',
  'skipafter',
  'sequence',
  'battr',
  'maxextended',
  'minbitrate',
  'maxbitrate',
  'boxingallowed',
  'playbackmethod',
  'playbackend',
  'delivery',
  'pos',
  'companionad',
  'api',
  'companiontype',
  'ext',
];
const TARGETING_VALUE_SEPARATOR = ',';

export const DEFAULT_BIDDER_CONFIG = {
  bidTTL: BID_TTL,
  defaultCurrency: DEFAULT_CURRENCY,
  exchangeUrl: EXCHANGE_URL,
  winTrackingEnabled: true,
  winTrackingUrl: WIN_TRACKING_URL,
  orgId: null,
};

config.setDefaults({
  adbookpsp: DEFAULT_BIDDER_CONFIG,
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  buildRequests,
  getUserSyncs,
  interpretResponse,
  isBidRequestValid,
  onBidWon,
};

registerBidder(spec);

/**
 * BID REQUEST
 */

function isBidRequestValid(bidRequest) {
  return (
    hasRequiredParams(bidRequest) &&
    (isValidBannerRequest(bidRequest) || isValidVideoRequest(bidRequest))
  );
}

function buildRequests(validBidRequests, bidderRequest) {
  const requests = [];

  if (validBidRequests.length > 0) {
    requests.push({
      method: 'POST',
      url: getBidderConfig('exchangeUrl'),
      options: {
        contentType: 'application/json',
        withCredentials: true,
      },
      data: buildRequest(validBidRequests, bidderRequest),
    });
  }

  return requests;
}

function buildRequest(validBidRequests, bidderRequest) {
  const request = {
    id: bidderRequest.bidderRequestId,
    tmax: bidderRequest.timeout,
    site: {
      domain: window.location.hostname,
      page: window.location.href,
      ref: bidderRequest.refererInfo.referer,
    },
    source: buildSource(validBidRequests, bidderRequest),
    device: buildDevice(),
    regs: buildRegs(bidderRequest),
    user: buildUser(bidderRequest),
    imp: validBidRequests.map(buildImp),
    ext: {
      adbook: {
        config: getBidderConfig(),
        version: {
          prebid: '$prebid.version$',
          adapter: VERSION,
        },
      },
    },
  };

  return JSON.stringify(request);
}

function buildDevice() {
  const { innerWidth, innerHeight } = common.getWindowDimensions();

  const device = {
    w: innerWidth,
    h: innerHeight,
    js: true,
    ua: navigator.userAgent,
    dnt:
      navigator.doNotTrack === 'yes' ||
      navigator.doNotTrack == '1' ||
      navigator.msDoNotTrack == '1'
        ? 1
        : 0,
  };

  const deviceConfig = common.getConfig('device');

  if (utils.isPlainObject(deviceConfig)) {
    return { ...device, ...deviceConfig };
  }

  return device;
}

function buildRegs(bidderRequest) {
  const regs = {
    coppa: common.getConfig('coppa') === true ? 1 : 0,
  };

  if (bidderRequest.gdprConsent) {
    utils.deepSetValue(
      regs,
      'ext.gdpr',
      bidderRequest.gdprConsent.gdprApplies ? 1 : 0
    );
    utils.deepSetValue(
      regs,
      'ext.gdprConsentString',
      bidderRequest.gdprConsent.consentString || ''
    );
  }

  if (bidderRequest.uspConsent) {
    utils.deepSetValue(regs, 'ext.us_privacy', bidderRequest.uspConsent);
  }

  return regs;
}

function buildSource(bidRequests, bidderRequest) {
  const source = {
    fd: 1,
    tid: bidderRequest.auctionId,
  };
  const schain = utils.deepAccess(bidRequests, '0.schain');

  if (schain) {
    utils.deepSetValue(source, 'ext.schain', schain);
  }

  return source;
}

function buildUser(bidderRequest) {
  const user = {
    id: getUserId(),
  };

  if (bidderRequest.gdprConsent) {
    user.gdprConsentString = bidderRequest.gdprConsent.consentString || '';
  }

  return user;
}

function buildImp(bidRequest) {
  let impBase = {
    id: bidRequest.bidId,
    tagid: bidRequest.adUnitCode,
    ext: buildImpExt(bidRequest),
  };

  return Object.keys(bidRequest.mediaTypes)
    .filter((mediaType) => includes(SUPPORTED_MEDIA_TYPES, mediaType))
    .reduce((imp, mediaType) => {
      return {
        ...imp,
        [mediaType]: buildMediaTypeObject(mediaType, bidRequest),
      };
    }, impBase);
}

function buildMediaTypeObject(mediaType, bidRequest) {
  switch (mediaType) {
    case BANNER:
      return buildBannerObject(bidRequest);
    case VIDEO:
      return buildVideoObject(bidRequest);
    default:
      utils.logWarn(`${BIDDER_CODE}: Unsupported media type ${mediaType}!`);
  }
}

function buildBannerObject(bidRequest) {
  const format = bidRequest.mediaTypes.banner.sizes.map((size) => {
    const [w, h] = size;

    return { w, h };
  });
  const { w, h } = format[0];

  return {
    pos: 0,
    topframe: utils.inIframe() ? 0 : 1,
    format,
    w,
    h,
  };
}

function buildVideoObject(bidRequest) {
  const { w, h } = getVideoSize(bidRequest);
  let videoObj = {
    w,
    h,
  };

  for (const param of VIDEO_PARAMS) {
    const paramsValue = utils.deepAccess(bidRequest, `params.video.${param}`);
    const mediaTypeValue = utils.deepAccess(
      bidRequest,
      `mediaTypes.video.${param}`
    );

    if (paramsValue || mediaTypeValue) {
      videoObj[param] = paramsValue || mediaTypeValue;
    }
  }

  return videoObj;
}

function getVideoSize(bidRequest) {
  const playerSize = utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize', [[]]);
  const { w, h } = utils.deepAccess(bidRequest, 'mediaTypes.video', {});

  if (utils.isNumber(w) && utils.isNumber(h)) {
    return { w, h };
  }

  return {
    w: playerSize[0][0],
    h: playerSize[0][1],
  }
}

function buildImpExt(validBidRequest) {
  const defaultOrgId = getBidderConfig('orgId');
  const { orgId, placementId } = validBidRequest.params || {};
  const effectiverOrgId = orgId || defaultOrgId;
  const ext = {};

  if (placementId) {
    utils.deepSetValue(ext, 'adbook.placementId', placementId);
  }

  if (effectiverOrgId) {
    utils.deepSetValue(ext, 'adbook.orgId', effectiverOrgId);
  }

  return ext;
}

/**
 * BID RESPONSE
 */

function interpretResponse(bidResponse, bidderRequest) {
  const bidderRequestBody = safeJSONparse(bidderRequest.data);

  if (
    utils.deepAccess(bidderRequestBody, 'id') !=
    utils.deepAccess(bidResponse, 'body.id')
  ) {
    utils.logError(
      `${BIDDER_CODE}: Bid response id does not match bidder request id`
    );

    return [];
  }

  const referrer = utils.deepAccess(bidderRequestBody, 'site.ref', '');
  const incomingBids = utils
    .deepAccess(bidResponse, 'body.seatbid', [])
    .filter((seat) => utils.isArray(seat.bid))
    .reduce((bids, seat) => bids.concat(seat.bid), [])
    .filter(validateBid(bidderRequestBody));
  const targetingMap = buildTargetingMap(incomingBids);

  return impBidsToPrebidBids(
    incomingBids,
    bidderRequestBody,
    bidResponse.body.cur,
    referrer,
    targetingMap
  );
}

function impBidsToPrebidBids(
  incomingBids,
  bidderRequestBody,
  bidResponseCurrency,
  referrer,
  targetingMap
) {
  return incomingBids
    .map(
      impToPrebidBid(
        bidderRequestBody,
        bidResponseCurrency,
        referrer,
        targetingMap
      )
    )
    .filter((i) => i !== null);
}

const impToPrebidBid =
  (bidderRequestBody, bidResponseCurrency, referrer, targetingMap) => (bid) => {
    try {
      const bidRequest = findBidRequest(bidderRequestBody, bid);

      if (!bidRequest) {
        utils.logError(`${BIDDER_CODE}: Could not match bid to bid request`);

        return null;
      }
      const categories = utils.deepAccess(bid, 'cat', []);
      const mediaType = getMediaType(bid.adm);
      let prebidBid = {
        ad: bid.adm,
        adId: bid.adid,
        adserverTargeting: targetingMap[bid.impid],
        adUnitCode: bidRequest.tagid,
        bidderRequestId: bidderRequestBody.id,
        bidId: bid.id,
        cpm: bid.price,
        creativeId: bid.crid || bid.id,
        currency: bidResponseCurrency || getBidderConfig('defaultCurrency'),
        height: bid.h,
        lineItemId: utils.deepAccess(bid, 'ext.liid'),
        mediaType,
        meta: {
          advertiserDomains: bid.adomain,
          mediaType,
          primaryCatId: categories[0],
          secondaryCatIds: categories.slice(1),
        },
        netRevenue: true,
        nurl: bid.nurl,
        referrer: referrer,
        requestId: bid.impid,
        ttl: getBidderConfig('bidTTL'),
        width: bid.w,
      };

      if (mediaType === VIDEO) {
        prebidBid = {
          ...prebidBid,
          ...getVideoSpecificParams(bidRequest, bid),
        };
      }

      return prebidBid;
    } catch (error) {
      utils.logError(`${BIDDER_CODE}: Error while building bid`, error);

      return null;
    }
  };

function getVideoSpecificParams(bidRequest, bid) {
  return {
    height: bid.h || bidRequest.video.h,
    vastXml: bid.adm,
    width: bid.w || bidRequest.video.w,
  };
}

function buildTargetingMap(bids) {
  const impIds = bids.map(({ impid }) => impid).filter(utils.uniques);
  const values = impIds.reduce((result, id) => {
    result[id] = {
      lineItemIds: [],
      dealIds: [],
      adIds: [],
    };

    return result;
  }, {});

  bids.forEach((bid) => {
    values[bid.impid].lineItemIds.push(bid.ext.liid);
    values[bid.impid].dealIds.push(bid.dealid);
    values[bid.impid].adIds.push(bid.adid);
  });

  const targetingMap = {};

  for (const id of impIds) {
    targetingMap[id] = {
      hb_liid_adbookpsp: values[id].lineItemIds.join(TARGETING_VALUE_SEPARATOR),
      hb_deal_adbookpsp: values[id].dealIds.join(TARGETING_VALUE_SEPARATOR),
      hb_adid_c_adbookpsp: values[id].adIds.join(TARGETING_VALUE_SEPARATOR),
    };
  }

  return targetingMap;
}

/**
 * VALIDATION
 */

function hasRequiredParams(bidRequest) {
  const value =
    utils.deepAccess(bidRequest, 'params.placementId') != null ||
    utils.deepAccess(bidRequest, 'params.orgId') != null ||
    getBidderConfig('orgId') != null;

  if (!value) {
    utils.logError(`${BIDDER_CODE}: missing orgId and placementId parameter`);
  }

  return value;
}

function isValidBannerRequest(bidRequest) {
  const value = validateSizes(
    utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes', [])
  );

  return value;
}

function isValidVideoRequest(bidRequest) {
  const value =
    utils.isArray(utils.deepAccess(bidRequest, 'mediaTypes.video.mimes')) &&
    validateVideoSizes(bidRequest);

  return value;
}

function validateSize(size) {
  return utils.isArray(size) && size.length === 2 && size.every(utils.isNumber);
}

function validateSizes(sizes) {
  return utils.isArray(sizes) && sizes.length > 0 && sizes.every(validateSize);
}

function validateVideoSizes(bidRequest) {
  const { w, h } = utils.deepAccess(bidRequest, 'mediaTypes.video', {});

  return (
    validateSizes(
      utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize')
    ) ||
    (utils.isNumber(w) && utils.isNumber(h))
  );
}

function validateBid(bidderRequestBody) {
  return function (bid) {
    const mediaType = getMediaType(bid.adm);
    const bidRequest = findBidRequest(bidderRequestBody, bid);
    let validators = commonBidValidators;

    if (mediaType === BANNER) {
      validators = [...commonBidValidators, ...bannerBidValidators];
    }

    const value = validators.every((validator) => validator(bid, bidRequest));

    if (!value) {
      utils.logWarn(`${BIDDER_CODE}: Invalid bid`, bid);
    }

    return value;
  };
}

const commonBidValidators = [
  (bid) => utils.isPlainObject(bid),
  (bid) => isNonEmptyStr(bid.adid),
  (bid) => isNonEmptyStr(bid.adm),
  (bid) => isNonEmptyStr(bid.id),
  (bid) => isNonEmptyStr(bid.impid),
  (bid) => isNonEmptyStr(utils.deepAccess(bid, 'ext.liid')),
  (bid) => utils.isNumber(bid.price),
];

const bannerBidValidators = [
  validateBannerDimension('w'),
  validateBannerDimension('h'),
];

function validateBannerDimension(dimension) {
  return function (bid, bidRequest) {
    if (bid[dimension] == null) {
      return bannerHasSingleSize(bidRequest);
    }

    return utils.isNumber(bid[dimension]);
  };
}

function bannerHasSingleSize(bidRequest) {
  return utils.deepAccess(bidRequest, 'banner.format', []).length === 1;
}

/**
 * USER SYNC
 */

export const storage = getStorageManager();

function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent) {
  return responses
    .map((response) => utils.deepAccess(response, 'body.ext.sync'))
    .filter(utils.isArray)
    .reduce(utils.flatten, [])
    .filter(validateSync(syncOptions))
    .map(applyConsents(gdprConsent, uspConsent));
}

const validateSync = (syncOptions) => (sync) => {
  return (
    ((sync.type === 'image' && syncOptions.pixelEnabled) ||
      (sync.type === 'iframe' && syncOptions.iframeEnabled)) &&
    sync.url
  );
};

const applyConsents = (gdprConsent, uspConsent) => (sync) => {
  const url = getUrlBuilder(sync.url);

  if (gdprConsent) {
    url.set('gdpr', gdprConsent.gdprApplies ? 1 : 0);
    url.set('consentString', gdprConsent.consentString || '');
  }
  if (uspConsent) {
    url.set('us_privacy', encodeURIComponent(uspConsent));
  }
  if (common.getConfig('coppa') === true) {
    url.set('coppa', 1);
  }

  return { ...sync, url: url.toString() };
};

function getUserId() {
  const id = getUserIdFromStorage() || common.generateUUID();

  setUserId(id);

  return id;
}

function getUserIdFromStorage() {
  const id = storage.localStorageIsEnabled()
    ? storage.getDataFromLocalStorage(USER_ID_KEY)
    : storage.getCookie(USER_ID_KEY);

  if (!validateUUID(id)) {
    return;
  }

  return id;
}

function setUserId(userId) {
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(USER_ID_KEY, userId);
  }

  if (storage.cookiesAreEnabled()) {
    const expires = new Date(Date.now() + USER_ID_COOKIE_EXP).toISOString();

    storage.setCookie(USER_ID_KEY, userId, expires);
  }
}

function validateUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

/**
 * EVENT TRACKING
 */

function onBidWon(bid) {
  if (!getBidderConfig('winTrackingEnabled')) {
    return;
  }

  const wurl = buildWinUrl(bid);

  if (wurl !== null) {
    utils.triggerPixel(wurl);
  }

  if (utils.isStr(bid.nurl)) {
    utils.triggerPixel(bid.nurl);
  }
}

function buildWinUrl(bid) {
  try {
    const url = getUrlBuilder(getBidderConfig('winTrackingUrl'));

    url.set('impId', bid.requestId);
    url.set('reqId', bid.bidderRequestId);
    url.set('bidId', bid.bidId);

    return url.toString();
  } catch (_) {
    utils.logError(
      `${BIDDER_CODE}: Could not build win tracking URL with %s`,
      getBidderConfig('winTrackingUrl')
    );

    return null;
  }
}

/**
 * COMMON
 */

const VAST_REGEXP = /VAST\s+version/;

function getMediaType(adm) {
  const videoRegex = new RegExp(VAST_REGEXP);

  if (videoRegex.test(adm)) {
    return VIDEO;
  }

  const markup = safeJSONparse(adm.replace(/\\/g, ''));

  if (markup && utils.isPlainObject(markup.native)) {
    return NATIVE;
  }

  return BANNER;
}

function safeJSONparse(...args) {
  try {
    return JSON.parse(...args);
  } catch (_) {
    return undefined;
  }
}

function isNonEmptyStr(value) {
  return utils.isStr(value) && !utils.isEmptyStr(value);
}

function findBidRequest(bidderRequest, bid) {
  return find(bidderRequest.imp, (imp) => imp.id === bid.impid);
}

function getBidderConfig(property) {
  if (!property) {
    return common.getConfig(`${BIDDER_CODE}`);
  }

  return common.getConfig(`${BIDDER_CODE}.${property}`);
}

const getUrlBase = function (url) {
  return url.split('?')[0];
};

const getUrlQuery = function (url) {
  const query = url.split('?')[1];

  if (!query) {
    return;
  }

  return '?' + query.split('#')[0];
};

const getUrlHash = function (url) {
  const hash = url.split('#')[1];

  if (!hash) {
    return;
  }

  return '#' + hash;
};

const getUrlBuilder = function (url) {
  const hash = getUrlHash(url);
  const base = getUrlBase(url);
  const query = getUrlQuery(url);
  const pairs = [];

  function set(key, value) {
    pairs.push([key, value]);

    return {
      set,
      toString,
    };
  }

  function toString() {
    if (!pairs.length) {
      return url;
    }

    const queryString = pairs
      .map(function (pair) {
        return pair.join('=');
      })
      .join('&');

    if (!query) {
      return base + '?' + queryString + (hash || '');
    }

    return base + query + '&' + queryString + (hash || '');
  }

  return {
    set,
    toString,
  };
};

export const common = {
  generateUUID: function () {
    return utils.generateUUID();
  },
  getConfig: function (property) {
    return config.getConfig(property);
  },
  getWindowDimensions: function () {
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  },
};
