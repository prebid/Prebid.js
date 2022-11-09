import {
  _each,
  contains,
  deepAccess,
  deepSetValue,
  getDNT,
  isInteger,
  logError,
  logInfo,
  isBoolean,
  isStr
} from '../src/utils.js';
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
};

const endpoints = {
  request: `${BASE_URL}/bid/request`,
  notice: {
    win: `${BASE_URL}/notice/win`,
    timeout: `${BASE_URL}/notice/timeout`,
    error: `${BASE_URL}/notice/error`,
  }
}

export function setEndPoints(env = null, path = '', mediaType = BANNER) {
  switch (env) {
    case 'local':
      endpoints.request = mediaType === BANNER ? `${LOCAL_BASE_URL}${path}/bid/request` : `${LOCAL_BASE_URL}${path}/bid/videorequest`
      endpoints.notice.win = `${LOCAL_BASE_URL}${path}/notice/win`
      endpoints.notice.error = `${LOCAL_BASE_URL}${path}/notice/error`
      endpoints.notice.timeout = `${LOCAL_BASE_URL}${path}/notice/timeout`
      break;
    case 'main':
      endpoints.request = mediaType === BANNER ? `${BASE_URL}${path}/bid/request` : `${BASE_URL}${path}/bid/videorequest`
      endpoints.notice.win = `${BASE_URL}${path}/notice/win`
      endpoints.notice.error = `${BASE_URL}${path}/notice/error`
      endpoints.notice.timeout = `${BASE_URL}${path}/notice/timeout`
      break;
  }
  return endpoints
}

let ortb2 = {}

config.getConfig('aidem', function (config) {
  if (config.aidem.env) { setEndPoints(config.aidem.env, config.aidem.path, config.aidem.mediaType) }
})

config.getConfig('ortb2', function (config) {
  ortb2 = Object.assign({}, ortb2, config.ortb2)
})

// AIDEM Custom FN
function recur(obj) {
  var result = {}; var _tmp;
  for (var i in obj) {
    // enabledPlugin is too nested, also skip functions
    if (!(i === 'enabledPlugin' || typeof obj[i] === 'function')) {
      if (typeof obj[i] === 'object') {
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

/**
 * Determines whether or not the given object is valid size format.
 *
 * @param  {*}       size The object to be validated.
 * @return {boolean}      True if this is a valid size format, and false otherwise.
 */
function isValidSize(size) {
  return Array.isArray(size) && size.length === 2 && isInteger(size[0]) && isInteger(size[1]);
}

/**
 * Determines whether or not the given size object is an element of the size
 * array.
 *
 * @param  {array}  sizeArray The size array.
 * @param  {object} size      The size object.
 * @return {boolean}          True if the size object is an element of the size array, and false
 *                            otherwise.
 */
function includesSize(sizeArray = [], size = []) {
  if (isValidSize(sizeArray)) {
    return sizeArray[0] === size[0] && sizeArray[1] === size[1];
  }
  for (let i = 0; i < sizeArray.length; i++) {
    if (sizeArray[i][0] === size[0] && sizeArray[i][1] === size[1]) {
      return true;
    }
  }
  return false;
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
    dnt: getDNT() ? 1 : 0,
    language: language,
    connectiontype: getConnectionType(),
    screen_width: screen.width,
    screen_height: screen.height
  };
}

function getRegs() {
  let regs = {};
  const consentManagement = config.getConfig('consentManagement')
  const coppa = config.getConfig('coppa')
  if (consentManagement && !!(consentManagement.gdpr)) {
    deepSetValue(regs, 'gdpr', !!consentManagement.gdpr);
  }
  if (consentManagement && deepAccess(consentManagement, 'usp.cmpApi') === 'static') {
    deepSetValue(regs, 'us_privacy', deepAccess(consentManagement, 'usp.consentData.getUSPData.uspString'));
  }
  if (isBoolean(coppa)) {
    deepSetValue(regs, 'coppa', !!coppa);
  }

  return regs;
}

/**
 * Returns bidder request page url.
 *
 * @param {Object} bidderRequest
 * @return {string}
 */
function getPageUrl(bidderRequest) {
  return bidderRequest?.refererInfo?.page
}

function buildWonBidNotice(bid) {
  const winNotice = {
    adId: bid.adId,
    adUnitCode: bid.adUnitCode,
    creativeId: bid.creativeId,
    cpm: bid.cpm,
    netRevenue: bid.netRevenue,
    adserverTargeting: bid.adserverTargeting,
    auctionId: bid.auctionId,
    currency: bid.currency,
    mediaType: bid.mediaType,
    size: bid.size,
    width: bid.width,
    height: bid.height,
    status: bid.status,
    transactionId: bid.transactionId,
    ttl: bid.ttl,
    requestTimestamp: bid.requestTimestamp,
    responseTimestamp: bid.responseTimestamp,
    metrics: {}
  }

  if (bid.metrics && typeof bid.metrics.getMetrics === 'function') {
    const metrics = bid.metrics.getMetrics()
    deepSetValue(winNotice.metrics, 'requestBids.validate', metrics['requestBids.validate'])
    deepSetValue(winNotice.metrics, 'requestBids.makeRequests', metrics['requestBids.makeRequests'])
    deepSetValue(winNotice.metrics, 'requestBids.total', metrics['requestBids.total'])
    deepSetValue(winNotice.metrics, 'requestBids.callBids', metrics['requestBids.callBids'])
    deepSetValue(winNotice.metrics, 'adapter.client.validate', metrics['adapter.client.validate'])
    deepSetValue(winNotice.metrics, 'adapter.client.buildRequests', metrics['adapter.client.buildRequests'])
    deepSetValue(winNotice.metrics, 'adapter.client.total', metrics['adapter.client.total'])
    deepSetValue(winNotice.metrics, 'adapter.client.net', metrics['adapter.client.net'])
    deepSetValue(winNotice.metrics, 'adapter.client.interpretResponse', metrics['adapter.client.interpretResponse'])
    deepSetValue(winNotice.metrics, 'addBidResponse.validate', metrics['addBidResponse.validate'])
    deepSetValue(winNotice.metrics, 'addBidResponse.total', metrics['addBidResponse.total'])
    deepSetValue(winNotice.metrics, 'render.pending', metrics['render.pending'])
    deepSetValue(winNotice.metrics, 'render.e2e', metrics['render.e2e'])
  }

  return winNotice
}

// Called for every bid that has timed out
function buildTimeoutNotice(prebidTimeoutBids) {
  const timeoutNotice = {
    bids: []
  }
  _each(prebidTimeoutBids, function (bid) {
    const notice = {
      adUnitCode: bid.adUnitCode,
      auctionId: bid.auctionId,
      bidId: bid.bidId,
      bidderRequestId: bid.bidderRequestId,
      transactionId: bid.transactionId,
      mediaTypes: bid.mediaTypes,
      metrics: { },
      timeout: bid.timeout,
    }

    if (bid.metrics && typeof bid.metrics.getMetrics === 'function') {
      const metrics = bid.metrics.getMetrics()
      deepSetValue(notice.metrics, 'requestBids.validate', metrics['requestBids.validate'])
      deepSetValue(notice.metrics, 'requestBids.makeRequests', metrics['requestBids.makeRequests'])
      deepSetValue(notice.metrics, 'requestBids.total', metrics['requestBids.total'])
      deepSetValue(notice.metrics, 'requestBids.callBids', metrics['requestBids.callBids'])
      deepSetValue(notice.metrics, 'adapter.client.validate', metrics['adapter.client.validate'])
      deepSetValue(notice.metrics, 'adapter.client.buildRequests', metrics['adapter.client.buildRequests'])
      deepSetValue(notice.metrics, 'adapter.client.total', metrics['adapter.client.total'])
      deepSetValue(notice.metrics, 'adapter.client.net', metrics['adapter.client.net'])
      deepSetValue(notice.metrics, 'adapter.client.interpretResponse', metrics['adapter.client.interpretResponse'])
    }

    timeoutNotice.bids.push(notice)
  })

  return timeoutNotice
}

function buildErrorNotice(prebidErrorResponse) {
  const errorNotice = {
    message: `Prebid.js: Server call for ${prebidErrorResponse.bidderCode} failed.`,
    url: encodeURIComponent(getPageUrl(prebidErrorResponse)),
    auctionId: prebidErrorResponse.auctionId,
    bidderRequestId: prebidErrorResponse.bidderRequestId,
    metrics: {}
  }
  if (prebidErrorResponse.metrics && typeof prebidErrorResponse.metrics.getMetrics === 'function') {
    const metrics = prebidErrorResponse.metrics.getMetrics()
    deepSetValue(errorNotice.metrics, 'requestBids.validate', metrics['requestBids.validate'])
    deepSetValue(errorNotice.metrics, 'requestBids.makeRequests', metrics['requestBids.makeRequests'])
    deepSetValue(errorNotice.metrics, 'requestBids.total', metrics['requestBids.total'])
    deepSetValue(errorNotice.metrics, 'requestBids.callBids', metrics['requestBids.callBids'])
    deepSetValue(errorNotice.metrics, 'adapter.client.validate', metrics['adapter.client.validate'])
    deepSetValue(errorNotice.metrics, 'adapter.client.buildRequests', metrics['adapter.client.buildRequests'])
    deepSetValue(errorNotice.metrics, 'adapter.client.total', metrics['adapter.client.total'])
    deepSetValue(errorNotice.metrics, 'adapter.client.net', metrics['adapter.client.net'])
    deepSetValue(errorNotice.metrics, 'adapter.client.interpretResponse', metrics['adapter.client.interpretResponse'])
  }
  return errorNotice
}

/**
 * Get One size from Size Array
 * [[250,350]] -> [250, 350]
 * [250, 350]  -> [250, 350]
 * @param {array} sizes array of sizes
 */
function getFirstSize(sizes = []) {
  if (isValidSize(sizes)) {
    return sizes;
  } else if (isValidSize(sizes[0])) {
    return sizes[0];
  }

  return false;
}

function hasValidFloor(obj) {
  if (!obj) return false
  const hasValue = !isNaN(Number(obj.value))
  const hasCurrency = contains(AVAILABLE_CURRENCIES, obj.currency)
  return hasValue && hasCurrency
}

function getMediaType(bidRequest) {
  if ((bidRequest.mediaTypes && bidRequest.mediaTypes.hasOwnProperty('video')) || bidRequest.params.hasOwnProperty('video')) { return VIDEO }
  return BANNER
}

function getPrebidRequestFields(bidderRequest, bidRequests) {
  const payload = {}
  // Base Payload Data
  deepSetValue(payload, 'id', bidderRequest.auctionId);
  // Impressions
  setPrebidImpressionObject(bidRequests, payload)
  // Device
  deepSetValue(payload, 'device', getDevice())
  // Timeout
  deepSetValue(payload, 'tmax', bidderRequest.timeout);
  // Currency
  deepSetValue(payload, 'cur', DEFAULT_CURRENCY);
  // Timezone
  deepSetValue(payload, 'tz', new Date().getTimezoneOffset());
  // Privacy Regs
  deepSetValue(payload, 'regs', getRegs());
  // Site
  setPrebidSiteObject(bidderRequest, payload)
  // Environment
  setPrebidRequestEnvironment(payload)
  // AT auction type
  deepSetValue(payload, 'at', 1);
  // User
  payload.user = {};

  return payload
}

function setPrebidImpressionObject(bidRequests, payload) {
  payload.imp = [];
  payload.mediaTypes = []
  _each(bidRequests, function (bidRequest) {
    const impressionObject = {};
    // Placement or ad tag used to initiate the auction
    deepSetValue(impressionObject, 'id', bidRequest.bidId);
    // Site id
    deepSetValue(impressionObject, 'siteId', deepAccess(bidRequest, 'params.siteId'));
    // Tag id
    deepSetValue(impressionObject, 'tid', deepAccess(bidRequest, 'transactionId'));
    const mediaType = getMediaType(bidRequest)
    if (!payload.mediaTypes.includes(mediaType)) {
      payload.mediaTypes.push(mediaType)
    }
    switch (mediaType) {
      case 'banner':
        setPrebidImpressionObjectBanner(bidRequest, impressionObject)
        break;
      case 'video':
        setPrebidImpressionObjectVideo(bidRequest, impressionObject)
        break;
    }

    // Floor (optional)
    setPrebidImpressionObjectFloor(bidRequest, impressionObject)

    impressionObject.imp_ext = {};

    payload.imp.push(impressionObject);
  });
}

function setPrebidSiteObject(bidderRequest, payload) {
  deepSetValue(payload, 'site.domain', deepAccess(bidderRequest, 'refererInfo.domain'));
  deepSetValue(payload, 'site.page', deepAccess(bidderRequest, 'refererInfo.page'));
  deepSetValue(payload, 'site.referer', deepAccess(bidderRequest, 'refererInfo.ref'));
  deepSetValue(payload, 'site.cat', deepAccess(ortb2, 'site.cat'));
  deepSetValue(payload, 'site.sectioncat', deepAccess(ortb2, 'site.sectioncat'));
  deepSetValue(payload, 'site.keywords', deepAccess(ortb2, 'site.keywords'));
  deepSetValue(payload, 'site.site_ext', deepAccess(ortb2, 'site.ext')); // see https://docs.prebid.org/features/firstPartyData.html
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
}

function setPrebidImpressionObjectFloor(bidRequest, impressionObject) {
  const floor = deepAccess(bidRequest, 'params.floor')
  if (hasValidFloor(floor)) {
    deepSetValue(impressionObject, 'floor.value', floor.value)
    deepSetValue(impressionObject, 'floor.currency', floor.currency)
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
  deepSetValue(prebidResponseBidObject, 'requestId', openRTBResponseBidObject.id);
  deepSetValue(prebidResponseBidObject, 'cpm', parseFloat(openRTBResponseBidObject.price));
  deepSetValue(prebidResponseBidObject, 'currency', openRTBResponseBidObject.currency ? openRTBResponseBidObject.currency.toUpperCase() : DEFAULT_CURRENCY);
  deepSetValue(prebidResponseBidObject, 'width', openRTBResponseBidObject.w);
  deepSetValue(prebidResponseBidObject, 'height', openRTBResponseBidObject.h);
  deepSetValue(prebidResponseBidObject, 'creativeId', openRTBResponseBidObject.adid);
  deepSetValue(prebidResponseBidObject, 'dealId', openRTBResponseBidObject.deal)
  deepSetValue(prebidResponseBidObject, 'netRevenue', openRTBResponseBidObject.isNet ? openRTBResponseBidObject.isNet : false);
  deepSetValue(prebidResponseBidObject, 'ttl', 300);

  if (openRTBResponseBidObject.mediatype === VIDEO) {
    logInfo('bidObject.mediatype == VIDEO');
    deepSetValue(prebidResponseBidObject, 'mediaType', VIDEO);
    deepSetValue(prebidResponseBidObject, 'vastUrl', openRTBResponseBidObject.adm);
  } else {
    logInfo('bidObject.mediatype == BANNER');
    deepSetValue(prebidResponseBidObject, 'mediaType', BANNER);
    deepSetValue(prebidResponseBidObject, 'ad', openRTBResponseBidObject.adm);
  }
  setPrebidResponseBidObjectMeta(prebidResponseBidObject, openRTBResponseBidObject)
  return prebidResponseBidObject
}

function setPrebidResponseBidObjectMeta(prebidResponseBidObject, openRTBResponseBidObject) {
  deepSetValue(prebidResponseBidObject, 'meta.advertiserDomains', openRTBResponseBidObject.adomain && Array.isArray(openRTBResponseBidObject.adomain) ? openRTBResponseBidObject.adomain : []);
}

function hasValidMediaType(bidRequest) {
  const supported = hasBannerMediaType(bidRequest) || hasVideoMediaType(bidRequest)
  if (!supported) {
    logError('AIDEM Bid Adapter: media type not supported', { bidder: BIDDER_CODE, code: ERROR_CODES.MEDIA_TYPE_NOT_SUPPORTED });
  }
  return supported
}

function hasBannerMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner')
}

function hasVideoMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.video')
}

function hasValidBannerMediaType(bidRequest) {
  const sizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes')
  if (!sizes) {
    logError('AIDEM Bid Adapter: media type sizes missing', { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
    return false;
  }
  return true
}

function hasValidVideoMediaType(bidRequest) {
  const sizes = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  if (!sizes) {
    logError('AIDEM Bid Adapter: media type playerSize missing', { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
    return false;
  }
  return true
}

function hasValidBannerBidderParameters(bidRequest) {
  const mediaTypesSizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');
  const size = deepAccess(bidRequest, 'params.banner.size');
  const flatten = getFirstSize(size);
  if (size && !flatten) {
    logError('AIDEM Bid Adapter: size has invalid format.', { bidder: BIDDER_CODE, code: ERROR_CODES.BID_SIZE_INVALID_FORMAT });
    return false;
  }

  if (size && !(includesSize(mediaTypesSizes, flatten))) {
    logError('AIDEM Bid Adapter: bidder banner size is not included in ad unit banner sizes.', { bidder: BIDDER_CODE, code: ERROR_CODES.BID_SIZE_NOT_INCLUDED });
    return false;
  }

  return true
}

function hasValidVideoBidderParameters(bidRequest) {
  const mediaTypesSizes = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  const size = deepAccess(bidRequest, 'params.video.size');
  const flatten = getFirstSize(size);
  if (size && !flatten) {
    logError('AIDEM Bid Adapter: size has invalid format.', { bidder: BIDDER_CODE, code: ERROR_CODES.BID_SIZE_INVALID_FORMAT });
    return false;
  }
  if (size && !(includesSize(mediaTypesSizes, size))) {
    logError('AIDEM Bid Adapter: bidder banner size is not included in ad unit playerSize.', { bidder: BIDDER_CODE, code: ERROR_CODES.BID_SIZE_NOT_INCLUDED });
    return false;
  }

  return hasValidVideoParameters(bidRequest);
}

function hasValidVideoParameters(bidRequest) {
  let valid = true
  const adUnitsParameters = deepAccess(bidRequest, 'mediaTypes.video');
  const bidderParameter = deepAccess(bidRequest, 'params.video');
  for (let property of REQUIRED_VIDEO_PARAMS) {
    const hasAdUnitParameter = adUnitsParameters.hasOwnProperty(property)
    const hasBidderParameter = bidderParameter && bidderParameter.hasOwnProperty(property)
    if (!hasAdUnitParameter && !hasBidderParameter) {
      logError(`AIDEM Bid Adapter: ${property} is not included in either the adunit or params level`, { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
      valid = false
    }
  }

  return valid
}

function hasValidParameters(bidRequest) {
  // Assigned from AIDEM to a publisher website
  const siteId = deepAccess(bidRequest, 'params.siteId');
  if (!isStr(siteId)) {
    logError('AIDEM Bid Adapter: siteId must valid string', { bidder: BIDDER_CODE, code: ERROR_CODES.SITE_ID_INVALID_VALUE });
    return false;
  }

  return true
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bidRequest The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bidRequest) {
    logInfo('bid: ', bidRequest);

    // check if request has valid mediaTypes
    if (!hasValidMediaType(bidRequest)) return false

    // check if request has valid media type parameters at adUnit level
    if (hasBannerMediaType(bidRequest) && !hasValidBannerMediaType(bidRequest)) {
      return false
    }
    if (hasVideoMediaType(bidRequest) && !hasValidVideoMediaType(bidRequest)) {
      return false
    }

    // check if request has valid media type parameters at adUnit level
    if (hasBannerMediaType(bidRequest) && !hasValidBannerBidderParameters(bidRequest)) {
      return false
    }
    if (hasVideoMediaType(bidRequest) && !hasValidVideoBidderParameters(bidRequest)) {
      return false
    }

    return hasValidParameters(bidRequest)
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param validBidRequests[] - An array of bidRequest objects, one for each AdUnit that your module is involved in
   * @param bidderRequest - The master bidRequest object. This object is useful because it carries a couple of bid parameters that are global to all the bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    logInfo('validBidRequests: ', validBidRequests);
    logInfo('bidderRequest: ', bidderRequest);
    const prebidRequest = getPrebidRequestFields(bidderRequest, validBidRequests)
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

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse) {
    const bids = [];
    logInfo('serverResponse: ', serverResponse);
    _each(serverResponse.body.seatbid, function (bidSeatObject) {
      logInfo('bidSeatObject: ', bidSeatObject);
      _each(bidSeatObject.bid, function (bidObject) {
        logInfo('bidObject: ', bidObject);
        if (!bidObject.price || !bidObject.adm) {
          return;
        }
        logInfo('CPM OK');
        const bid = getPrebidResponseBidObject(bidObject)
        bids.push(bid);
      });
    });

    return bids;
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid that won the auction
   */
  onBidWon: function(bid) {
    // Bidder specific code
    logInfo('onBidWon bid: ', bid);
    const notice = buildWonBidNotice(bid)
    ajax(endpoints.notice.win, null, JSON.stringify(notice), { method: 'POST', withCredentials: true });
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   *
   * @param {Array} data timeout specific data
   */
  onTimeout: (data) => {
    if (Array.isArray(data)) {
      const payload = buildTimeoutNotice(data)
      const payloadString = JSON.stringify(payload);
      ajax(endpoints.notice.timeout, null, payloadString, { method: 'POST', withCredentials: true });
    }
  },

  /**
   * Register bidder specific code, which will execute if the bidder responded with an error
   */
  onBidderError: function({ bidderRequest }) {
    // Bidder specific code
    const notice = buildErrorNotice(bidderRequest)
    ajax(endpoints.notice.error, null, JSON.stringify(notice), { method: 'POST', withCredentials: true });
  },
}
registerBidder(spec);
