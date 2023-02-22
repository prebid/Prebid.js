import {_each, contains, deepAccess, deepSetValue, getDNT, isBoolean, isStr, isNumber, logError, logInfo} from '../src/utils.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {ajax} from '../src/ajax.js';

const BIDDER_CODE = 'aidem';
const BASE_URL = 'https://zero.aidemsrv.com';
const LOCAL_BASE_URL = 'http://127.0.0.1:8787';

const AVAILABLE_CURRENCIES = ['USD'];
const DEFAULT_CURRENCY = ['USD']; // NOTE - USD is the only supported currency right now; Hardcoded for bids
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO];
const REQUIRED_VIDEO_PARAMS = [ 'mimes', 'protocols', 'context' ];

export const ERROR_CODES = {
  BID_SIZE_INVALID_FORMAT: 1,
  BID_SIZE_NOT_INCLUDED: 2,
  PROPERTY_NOT_INCLUDED: 3,
  SITE_ID_INVALID_VALUE: 4,
  MEDIA_TYPE_NOT_SUPPORTED: 5,
  PUBLISHER_ID_INVALID_VALUE: 6,
  INVALID_RATELIMIT: 7,
  PLACEMENT_ID_INVALID_VALUE: 8,
};

const endpoints = {
  request: `${BASE_URL}/bid/request`,
  notice: {
    win: `${BASE_URL}/notice/win`,
    timeout: `${BASE_URL}/notice/timeout`,
    error: `${BASE_URL}/notice/error`,
  }
};

export function setEndPoints(env = null, path = '', mediaType = BANNER) {
  switch (env) {
    case 'local':
      endpoints.request = mediaType === BANNER ? `${LOCAL_BASE_URL}${path}/bid/request` : `${LOCAL_BASE_URL}${path}/bid/videorequest`;
      endpoints.notice.win = `${LOCAL_BASE_URL}${path}/notice/win`;
      endpoints.notice.error = `${LOCAL_BASE_URL}${path}/notice/error`;
      endpoints.notice.timeout = `${LOCAL_BASE_URL}${path}/notice/timeout`;
      break;
    case 'main':
      endpoints.request = mediaType === BANNER ? `${BASE_URL}${path}/bid/request` : `${BASE_URL}${path}/bid/videorequest`;
      endpoints.notice.win = `${BASE_URL}${path}/notice/win`;
      endpoints.notice.error = `${BASE_URL}${path}/notice/error`;
      endpoints.notice.timeout = `${BASE_URL}${path}/notice/timeout`;
      break;
  }
  return endpoints;
}

config.getConfig('aidem', function (config) {
  if (config.aidem.env) { setEndPoints(config.aidem.env, config.aidem.path, config.aidem.mediaType); }
});

// AIDEM Custom FN
function recur(obj) {
  var result = {}; var _tmp;
  for (var i in obj) {
    // enabledPlugin is too nested, also skip functions
    if (!(i === 'enabledPlugin' || typeof obj[i] === 'function')) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        // get props recursively
        _tmp = recur(obj[i]);
        // if object is not {}
        if (Object.keys(_tmp).length) {
          result[i] = _tmp;
        }
      } else {
        // string, number or boolean
        result[i] = obj[i];
      }
    }
  }
  return result;
}

// =================================================================================
function getConnectionType() {
  const connection = navigator.connection || navigator.webkitConnection;
  if (!connection) {
    return 0;
  }
  switch (connection.type) {
    case 'ethernet':
      return 1;
    case 'wifi':
      return 2;
    case 'cellular':
      switch (connection.effectiveType) {
        case 'slow-2g':
          return 4;
        case '2g':
          return 4;
        case '3g':
          return 5;
        case '4g':
          return 6;
        case '5g':
          return 7;
        default:
          return 3;
      }
    default:
      return 0;
  }
}

function getDevice() {
  const language = navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage;
  return {
    ua: navigator.userAgent,
    dnt: !!getDNT(),
    language: language,
    connectiontype: getConnectionType(),
    screen_width: screen.width,
    screen_height: screen.height
  };
}

function getRegs() {
  let regs = {};
  const consentManagement = config.getConfig('consentManagement');
  const coppa = config.getConfig('coppa');
  if (consentManagement && !!(consentManagement.gdpr)) {
    deepSetValue(regs, 'gdpr_applies', !!consentManagement.gdpr);
  } else {
    deepSetValue(regs, 'gdpr_applies', false);
  }
  if (consentManagement && deepAccess(consentManagement, 'usp.cmpApi') === 'static') {
    deepSetValue(regs, 'usp_applies', !!deepAccess(consentManagement, 'usp'));
    deepSetValue(regs, 'us_privacy', deepAccess(consentManagement, 'usp.consentData.getUSPData.uspString'));
  } else {
    deepSetValue(regs, 'usp_applies', false);
  }

  if (isBoolean(coppa)) {
    deepSetValue(regs, 'coppa_applies', !!coppa);
  } else {
    deepSetValue(regs, 'coppa_applies', false);
  }

  return regs;
}

function getPageUrl(bidderRequest) {
  return bidderRequest?.refererInfo?.page;
}

function buildWinNotice(bid) {
  const params = bid.params[0];
  return {
    publisherId: params.publisherId,
    siteId: params.siteId,
    placementId: params.placementId,
    burl: deepAccess(bid, 'meta.burl'),
    cpm: bid.cpm,
    currency: bid.currency,
    impid: deepAccess(bid, 'meta.impid'),
    dsp_id: deepAccess(bid, 'meta.dsp_id'),
    adUnitCode: bid.adUnitCode,
    auctionId: bid.auctionId,
    transactionId: bid.transactionId,
    ttl: bid.ttl,
    requestTimestamp: bid.requestTimestamp,
    responseTimestamp: bid.responseTimestamp,
  };
}

function buildErrorNotice(prebidErrorResponse) {
  return {
    message: `Prebid.js: Server call for ${prebidErrorResponse.bidderCode} failed.`,
    url: encodeURIComponent(getPageUrl(prebidErrorResponse)),
    auctionId: prebidErrorResponse.auctionId,
    bidderRequestId: prebidErrorResponse.bidderRequestId,
    metrics: {}
  };
}

function hasValidFloor(obj) {
  if (!obj) return false;
  const hasValue = !isNaN(Number(obj.value));
  const hasCurrency = contains(AVAILABLE_CURRENCIES, obj.currency);
  return hasValue && hasCurrency;
}

function getMediaType(bidRequest) {
  if ((bidRequest.mediaTypes && bidRequest.mediaTypes.hasOwnProperty('video')) || bidRequest.params.hasOwnProperty('video')) { return VIDEO; }
  return BANNER;
}

function getPrebidRequestFields(bidderRequest, bidRequests) {
  const payload = {};
  // Base Payload Data
  deepSetValue(payload, 'id', bidderRequest.auctionId);
  // Impressions
  setPrebidImpressionObject(bidRequests, payload);
  // Device
  deepSetValue(payload, 'device', getDevice());
  // Timeout
  deepSetValue(payload, 'tmax', bidderRequest.timeout);
  // Currency
  deepSetValue(payload, 'cur', DEFAULT_CURRENCY);
  // Timezone
  deepSetValue(payload, 'tz', new Date().getTimezoneOffset());
  // Privacy Regs
  deepSetValue(payload, 'regs', getRegs());
  // Site
  setPrebidSiteObject(bidderRequest, payload);
  // Environment
  setPrebidRequestEnvironment(payload);
  // AT auction type
  deepSetValue(payload, 'at', 1);

  return payload;
}

function setPrebidImpressionObject(bidRequests, payload) {
  payload.imp = [];
  _each(bidRequests, function (bidRequest) {
    const impressionObject = {};
    // Placement or ad tag used to initiate the auction
    deepSetValue(impressionObject, 'id', bidRequest.bidId);
    // Transaction id
    deepSetValue(impressionObject, 'tid', deepAccess(bidRequest, 'transactionId'));
    // placement id
    deepSetValue(impressionObject, 'tagid', deepAccess(bidRequest, 'params.placementId', null));
    // Publisher id
    deepSetValue(payload, 'site.publisher.id', deepAccess(bidRequest, 'params.publisherId'));
    // Site id
    deepSetValue(payload, 'site.id', deepAccess(bidRequest, 'params.siteId'));
    const mediaType = getMediaType(bidRequest);
    switch (mediaType) {
      case 'banner':
        setPrebidImpressionObjectBanner(bidRequest, impressionObject);
        break;
      case 'video':
        setPrebidImpressionObjectVideo(bidRequest, impressionObject);
        break;
    }

    // Floor (optional)
    setPrebidImpressionObjectFloor(bidRequest, impressionObject);

    impressionObject.imp_ext = {};

    payload.imp.push(impressionObject);
  });
}

function setPrebidSiteObject(bidderRequest, payload) {
  deepSetValue(payload, 'site.domain', deepAccess(bidderRequest, 'refererInfo.domain'));
  deepSetValue(payload, 'site.page', deepAccess(bidderRequest, 'refererInfo.page'));
  deepSetValue(payload, 'site.referer', deepAccess(bidderRequest, 'refererInfo.ref'));
  deepSetValue(payload, 'site.cat', deepAccess(bidderRequest, 'ortb2.site.cat'));
  deepSetValue(payload, 'site.sectioncat', deepAccess(bidderRequest, 'ortb2.site.sectioncat'));
  deepSetValue(payload, 'site.keywords', deepAccess(bidderRequest, 'ortb2.site.keywords'));
  deepSetValue(payload, 'site.site_ext', deepAccess(bidderRequest, 'ortb2.site.ext')); // see https://docs.prebid.org/features/firstPartyData.html
}

function setPrebidRequestEnvironment(payload) {
  const __navigator = JSON.parse(JSON.stringify(recur(navigator)));
  delete __navigator.plugins;
  deepSetValue(payload, 'environment.ri', getRefererInfo());
  deepSetValue(payload, 'environment.hl', window.history.length);
  deepSetValue(payload, 'environment.nav', __navigator);
  deepSetValue(payload, 'environment.inp.euc', window.encodeURIComponent.name === 'encodeURIComponent' && typeof window.encodeURIComponent.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.eu', window.encodeURI.name === 'encodeURI' && typeof window.encodeURI.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.js', window.JSON.stringify.name === 'stringify' && typeof window.JSON.stringify.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.jp', window.JSON.parse.name === 'parse' && typeof window.JSON.parse.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.ofe', window.Object.fromEntries.name === 'fromEntries' && typeof window.Object.fromEntries.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.oa', window.Object.assign.name === 'assign' && typeof window.Object.assign.prototype === 'undefined');
  deepSetValue(payload, 'environment.wpar.innerWidth', window.innerWidth);
  deepSetValue(payload, 'environment.wpar.innerHeight', window.innerHeight);
}

function setPrebidImpressionObjectFloor(bidRequest, impressionObject) {
  const floor = deepAccess(bidRequest, 'params.floor');
  if (hasValidFloor(floor)) {
    deepSetValue(impressionObject, 'floor.value', floor.value);
    deepSetValue(impressionObject, 'floor.currency', floor.currency);
  }
}

function setPrebidImpressionObjectBanner(bidRequest, impressionObject) {
  deepSetValue(impressionObject, 'mediatype', BANNER);
  deepSetValue(impressionObject, 'banner.topframe', 1);
  deepSetValue(impressionObject, 'banner.format', []);
  _each(bidRequest.mediaTypes.banner.sizes, function (bannerFormat) {
    const format = {};
    deepSetValue(format, 'w', bannerFormat[0]);
    deepSetValue(format, 'h', bannerFormat[1]);
    deepSetValue(format, 'format_ext', {});
    impressionObject.banner.format.push(format);
  });
}

function setPrebidImpressionObjectVideo(bidRequest, impressionObject) {
  deepSetValue(impressionObject, 'mediatype', VIDEO);
  deepSetValue(impressionObject, 'video.format', []);
  deepSetValue(impressionObject, 'video.mimes', bidRequest.mediaTypes.video.mimes);
  deepSetValue(impressionObject, 'video.minDuration', bidRequest.mediaTypes.video.minduration);
  deepSetValue(impressionObject, 'video.maxDuration', bidRequest.mediaTypes.video.maxduration);
  deepSetValue(impressionObject, 'video.protocols', bidRequest.mediaTypes.video.protocols);
  deepSetValue(impressionObject, 'video.context', bidRequest.mediaTypes.video.context);
  deepSetValue(impressionObject, 'video.playbackmethod', bidRequest.mediaTypes.video.playbackmethod);
  deepSetValue(impressionObject, 'skip', bidRequest.mediaTypes.video.skip);
  deepSetValue(impressionObject, 'skipafter', bidRequest.mediaTypes.video.skipafter);
  deepSetValue(impressionObject, 'video.pos', bidRequest.mediaTypes.video.pos);
  _each(bidRequest.mediaTypes.video.playerSize, function (videoPlayerSize) {
    const format = {};
    deepSetValue(format, 'w', videoPlayerSize[0]);
    deepSetValue(format, 'h', videoPlayerSize[1]);
    deepSetValue(format, 'format_ext', {});
    impressionObject.video.format.push(format);
  });
}

function getPrebidResponseBidObject(openRTBResponseBidObject) {
  const prebidResponseBidObject = {};
  // Common properties
  deepSetValue(prebidResponseBidObject, 'requestId', openRTBResponseBidObject.impid);
  deepSetValue(prebidResponseBidObject, 'cpm', parseFloat(openRTBResponseBidObject.price));
  deepSetValue(prebidResponseBidObject, 'creativeId', openRTBResponseBidObject.crid);
  deepSetValue(prebidResponseBidObject, 'currency', openRTBResponseBidObject.cur ? openRTBResponseBidObject.cur.toUpperCase() : DEFAULT_CURRENCY);
  deepSetValue(prebidResponseBidObject, 'width', openRTBResponseBidObject.w);
  deepSetValue(prebidResponseBidObject, 'height', openRTBResponseBidObject.h);
  deepSetValue(prebidResponseBidObject, 'dealId', openRTBResponseBidObject.dealid);
  deepSetValue(prebidResponseBidObject, 'netRevenue', true);
  deepSetValue(prebidResponseBidObject, 'ttl', 60000);

  if (openRTBResponseBidObject.mediatype === VIDEO) {
    logInfo('bidObject.mediatype == VIDEO');
    deepSetValue(prebidResponseBidObject, 'mediaType', VIDEO);
    deepSetValue(prebidResponseBidObject, 'vastUrl', openRTBResponseBidObject.adm);
  } else {
    logInfo('bidObject.mediatype == BANNER');
    deepSetValue(prebidResponseBidObject, 'mediaType', BANNER);
    deepSetValue(prebidResponseBidObject, 'ad', openRTBResponseBidObject.adm);
  }
  setPrebidResponseBidObjectMeta(prebidResponseBidObject, openRTBResponseBidObject);
  return prebidResponseBidObject;
}

function setPrebidResponseBidObjectMeta(prebidResponseBidObject, openRTBResponseBidObject) {
  logInfo('AIDEM Bid Adapter meta', openRTBResponseBidObject);
  deepSetValue(prebidResponseBidObject, 'meta.advertiserDomains', deepAccess(openRTBResponseBidObject, 'meta.advertiserDomains'));
  if (openRTBResponseBidObject.cat && Array.isArray(openRTBResponseBidObject.cat)) {
    const primaryCatId = openRTBResponseBidObject.cat.shift();
    deepSetValue(prebidResponseBidObject, 'meta.primaryCatId', primaryCatId);
    deepSetValue(prebidResponseBidObject, 'meta.secondaryCatIds', openRTBResponseBidObject.cat);
  }
  deepSetValue(prebidResponseBidObject, 'meta.id', openRTBResponseBidObject.id);
  deepSetValue(prebidResponseBidObject, 'meta.dsp_id', openRTBResponseBidObject.dsp_id);
  deepSetValue(prebidResponseBidObject, 'meta.adid', openRTBResponseBidObject.adid);
  deepSetValue(prebidResponseBidObject, 'meta.burl', openRTBResponseBidObject.burl);
  deepSetValue(prebidResponseBidObject, 'meta.impid', openRTBResponseBidObject.impid);
  deepSetValue(prebidResponseBidObject, 'meta.cat', openRTBResponseBidObject.cat);
  deepSetValue(prebidResponseBidObject, 'meta.cid', openRTBResponseBidObject.cid);
}

function hasValidMediaType(bidRequest) {
  const supported = hasBannerMediaType(bidRequest) || hasVideoMediaType(bidRequest);
  if (!supported) {
    logError('AIDEM Bid Adapter: media type not supported', { bidder: BIDDER_CODE, code: ERROR_CODES.MEDIA_TYPE_NOT_SUPPORTED });
  }
  return supported;
}

function hasBannerMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner');
}

function hasVideoMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.video');
}

function hasValidBannerMediaType(bidRequest) {
  const sizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');
  if (!sizes) {
    logError('AIDEM Bid Adapter: media type sizes missing', { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
    return false;
  }
  return true;
}

function hasValidVideoMediaType(bidRequest) {
  const sizes = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  if (!sizes) {
    logError('AIDEM Bid Adapter: media type playerSize missing', { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
    return false;
  }
  return true;
}

function hasValidVideoParameters(bidRequest) {
  let valid = true;
  const adUnitsParameters = deepAccess(bidRequest, 'mediaTypes.video');
  const bidderParameter = deepAccess(bidRequest, 'params.video');
  for (let property of REQUIRED_VIDEO_PARAMS) {
    const hasAdUnitParameter = adUnitsParameters.hasOwnProperty(property);
    const hasBidderParameter = bidderParameter && bidderParameter.hasOwnProperty(property);
    if (!hasAdUnitParameter && !hasBidderParameter) {
      logError(`AIDEM Bid Adapter: ${property} is not included in either the adunit or params level`, { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
      valid = false;
    }
  }

  return valid;
}

function passesRateLimit(bidRequest) {
  const rateLimit = deepAccess(bidRequest, 'params.rateLimit', 1);
  if (!isNumber(rateLimit) || rateLimit > 1 || rateLimit < 0) {
    logError('AIDEM Bid Adapter: invalid rateLimit (must be a number between 0 and 1)', { bidder: BIDDER_CODE, code: ERROR_CODES.INVALID_RATELIMIT });
    return false;
  }
  if (rateLimit !== 1) {
    const randomRateValue = Math.random();
    if (randomRateValue > rateLimit) {
      return false;
    }
  }
  return true;
}

function hasValidParameters(bidRequest) {
  // Assigned from AIDEM to a publisher website
  const siteId = deepAccess(bidRequest, 'params.siteId');
  const publisherId = deepAccess(bidRequest, 'params.publisherId');

  if (!isStr(siteId)) {
    logError('AIDEM Bid Adapter: siteId must valid string', { bidder: BIDDER_CODE, code: ERROR_CODES.SITE_ID_INVALID_VALUE });
    return false;
  }

  if (!isStr(publisherId)) {
    logError('AIDEM Bid Adapter: publisherId must valid string', { bidder: BIDDER_CODE, code: ERROR_CODES.PUBLISHER_ID_INVALID_VALUE });
    return false;
  }

  return true;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid: function(bidRequest) {
    logInfo('bid: ', bidRequest);

    // check if request has valid mediaTypes
    if (!hasValidMediaType(bidRequest)) return false;

    // check if request has valid media type parameters at adUnit level
    if (hasBannerMediaType(bidRequest) && !hasValidBannerMediaType(bidRequest)) {
      return false;
    }

    if (hasVideoMediaType(bidRequest) && !hasValidVideoMediaType(bidRequest)) {
      return false;
    }

    if (hasVideoMediaType(bidRequest) && !hasValidVideoParameters(bidRequest)) {
      return false;
    }

    if (!hasValidParameters(bidRequest)) {
      return false;
    }

    return passesRateLimit(bidRequest);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    logInfo('validBidRequests: ', validBidRequests);
    logInfo('bidderRequest: ', bidderRequest);
    const prebidRequest = getPrebidRequestFields(bidderRequest, validBidRequests);
    const payloadString = JSON.stringify(prebidRequest);

    return {
      method: 'POST',
      url: endpoints.request,
      data: payloadString,
      options: {
        withCredentials: true
      }
    };
  },

  interpretResponse: function (serverResponse) {
    const bids = [];
    logInfo('serverResponse: ', serverResponse);
    _each(serverResponse.body.bid, function (bidObject) {
      logInfo('bidObject: ', bidObject);
      if (!bidObject.price || !bidObject.adm) {
        return;
      }
      logInfo('CPM OK');
      const bid = getPrebidResponseBidObject(bidObject);
      bids.push(bid);
    });
    return bids;
  },

  onBidWon: function(bid) {
    // Bidder specific code
    logInfo('onBidWon bid: ', bid);
    const notice = buildWinNotice(bid);
    ajax(endpoints.notice.win, null, JSON.stringify(notice), { method: 'POST', withCredentials: true });
  },

  onBidderError: function({ bidderRequest }) {
    // Bidder specific code
    const notice = buildErrorNotice(bidderRequest);
    ajax(endpoints.notice.error, null, JSON.stringify(notice), { method: 'POST', withCredentials: true });
  },
};
registerBidder(spec);
