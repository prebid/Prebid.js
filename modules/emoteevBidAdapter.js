/**
 * This file contains Emoteev bid adpater.
 *
 * It is organised as follows:
 *   - Constants values;
 *   - Spec API functions, which should be pristine pure;
 *   - Ancillary functions, which should be as pure as possible;
 *   - Adapter API, where unpure side-effects happen.
 *
 * The code style is « functional core, imperative shell ».
 *
 * @link   https://www.emoteev.io
 * @file   This files defines the spec of EmoteevBidAdapter.
 * @author Emoteev Engineering <engineering@emoteev.io>.
 */

import {registerBidder} from '../src/adapters/bidderFactory';
import {BANNER} from '../src/mediaTypes';
import {
  triggerPixel,
  getUniqueIdentifierStr,
  contains,
  deepAccess,
  isArray,
  isInteger,
  getParameterByName,
  getCookie
} from '../src/utils';
import {config} from '../src/config';
import * as url from '../src/url';

export const BIDDER_CODE = 'emoteev';

/**
 * Version number of the adapter API.
 */
export const ADAPTER_VERSION = '1.35.0';

export const DOMAIN = 'prebid.emoteev.io';
export const DOMAIN_STAGING = 'prebid-staging.emoteev.io';
export const DOMAIN_DEVELOPMENT = 'localhost:3000';

/**
 * Path of Emoteev endpoint for events.
 */
export const EVENTS_PATH = '/api/ad_event.json';

/**
 * Path of Emoteev bidder.
 */
export const BIDDER_PATH = '/api/prebid/bid';
export const USER_SYNC_IFRAME_PATH = '/api/prebid/sync-iframe';
export const USER_SYNC_IMAGE_PATH = '/api/prebid/sync-image';

export const PRODUCTION = 'production';
export const STAGING = 'staging';
export const DEVELOPMENT = 'development';
export const DEFAULT_ENV = PRODUCTION;

export const ON_ADAPTER_CALLED = 'on_adapter_called';
export const ON_BID_WON = 'on_bid_won';
export const ON_BIDDER_TIMEOUT = 'on_bidder_timeout';

export const IN_CONTENT = 'content';
export const FOOTER = 'footer';
export const OVERLAY = 'overlay';
export const WALLPAPER = 'wallpaper';

/**
 * Vendor ID assigned to Emoteev from the Global Vendor & CMP List.
 *
 * See https://vendorlist.consensu.org/vendorinfo.json for more information.
 * @type {number}
 */
export const VENDOR_ID = 15;

/**
 * Pure function. See http://prebid.org/dev-docs/bidder-adaptor.html#valid-build-requests-array for detailed semantic.
 *
 * @param {AdUnit.bidRequest} bidRequest
 * @returns {boolean} Is this bidRequest valid?
 */
export const isBidRequestValid = (bidRequest) => {
  return !!(
    bidRequest &&
    bidRequest.params &&
    deepAccess(bidRequest, 'params.adSpaceId') &&
    validateContext(deepAccess(bidRequest, 'params.context')) &&
    validateExternalId(deepAccess(bidRequest, 'params.externalId')) &&
    bidRequest.bidder === BIDDER_CODE &&
    validateSizes(deepAccess(bidRequest, 'mediaTypes.banner.sizes')));
};

/**
 * Pure function. See http://prebid.org/dev-docs/bidder-adaptor.html#serverrequest-objects for detailed semantic.
 *
 * @param {string} env Emoteev environment parameter
 * @param {boolean} debug Pbjs debug parameter.
 * @param {string} currency See http://prebid.org/dev-docs/modules/currency.html for detailed semantic.
 * @param {Array<BidRequest>} validBidRequests Takes an array of bid requests, which are guaranteed to have passed the isBidRequestValid() test.
 * @param  bidderRequest General context for a bidder request being constructed
 * @returns {ServerRequest}
 */
export const buildRequests = (env, debug, currency, validBidRequests, bidderRequest) => {
  return {
    method: 'POST',
    url: bidderUrl(env),
    data: JSON.stringify(requestsPayload(debug, currency, validBidRequests, bidderRequest)) // Keys with undefined values will be filtered out.
  };
};

/**
 * Pure function. See http://prebid.org/dev-docs/bidder-adaptor.html#interpreting-the-response for detailed semantic.
 *
 * @param {Array} serverResponse.body The body of the server response is an array of bid objects.
 * @returns {Array}
 */
export const interpretResponse = (serverResponse) => serverResponse.body;

/**
 * Pure function. See http://prebid.org/dev-docs/bidder-adaptor.html#registering-on-set-targeting for detailed semantic.
 *
 * @param {string} env Emoteev environment parameter.
 * @param {BidRequest} bidRequest
 * @returns {UrlObject}
 */
export function onAdapterCalled(env, bidRequest) {
  return {
    protocol: 'https',
    hostname: domain(env),
    pathname: EVENTS_PATH,
    search: {
      eventName: ON_ADAPTER_CALLED,
      pubcId: deepAccess(bidRequest, 'crumbs.pubcid'),
      bidId: bidRequest.bidId,
      adSpaceId: deepAccess(bidRequest, 'params.adSpaceId'),
      cache_buster: getUniqueIdentifierStr()
    }
  };
}

/**
 * Pure function. See http://prebid.org/dev-docs/bidder-adaptor.html#registering-on-bid-won for detailed semantic.
 *
 * @param {string} env Emoteev environment parameter.
 * @param {string} pubcId Publisher common id. See http://prebid.org/dev-docs/modules/pubCommonId.html for detailed semantic.
 * @param bidObject
 * @returns {UrlObject}
 */
export const onBidWon = (env, pubcId, bidObject) => {
  const bidId = bidObject.requestId;
  return {
    protocol: 'https',
    hostname: domain(env),
    pathname: EVENTS_PATH,
    search: {
      eventName: ON_BID_WON,
      pubcId,
      bidId,
      cache_buster: getUniqueIdentifierStr()
    }
  };
};

/**
 * Pure function. See http://prebid.org/dev-docs/bidder-adaptor.html#registering-on-timeout for detailed semantic.
 *
 * @param {string} env Emoteev environment parameter.
 * @param {BidRequest} bidRequest
 * @returns {UrlObject}
 */
export const onTimeout = (env, bidRequest) => {
  return {
    protocol: 'https',
    hostname: domain(env),
    pathname: EVENTS_PATH,
    search: {
      eventName: ON_BIDDER_TIMEOUT,
      pubcId: deepAccess(bidRequest, 'crumbs.pubcid'),
      bidId: bidRequest.bidId,
      adSpaceId: deepAccess(bidRequest, 'params.adSpaceId'),
      timeout: bidRequest.timeout,
      cache_buster: getUniqueIdentifierStr()
    }
  }
};

/**
 * Pure function. See http://prebid.org/dev-docs/bidder-adaptor.html#registering-user-syncs for detailed semantic.
 *
 * @param {string} env Emoteev environment parameter
 * @param {SyncOptions} syncOptions
 * @returns userSyncs
 */
export const getUserSyncs = (env, syncOptions) => {
  let syncs = [];
  if (syncOptions.pixelEnabled) {
    syncs.push({
      type: 'image',
      url: userSyncImageUrl(env),
    });
  }
  if (syncOptions.iframeEnabled) {
    syncs.push({
      type: 'iframe',
      url: userSyncIframeUrl(env),
    });
  }
  return syncs;
};

/**
 * Pure function.
 *
 * @param {string} env Emoteev environment parameter
 * @returns {string} The domain for network calls to Emoteev.
 */
export const domain = (env) => {
  switch (env) {
    case DEVELOPMENT:
      return DOMAIN_DEVELOPMENT;
    case STAGING:
      return DOMAIN_STAGING;
    default:
      return DOMAIN;
  }
};

/**
 * Pure function.
 *
 * @param {string} env Emoteev environment parameter
 * @returns {string} The full URL which events is sent to.
 */
export const eventsUrl = env => url.format({
  protocol: (env === DEVELOPMENT) ? 'http' : 'https',
  hostname: domain(env),
  pathname: EVENTS_PATH
});

/**
 * Pure function.
 *
 * @param {string} env Emoteev environment parameter
 * @returns {string} The full URL which bidderRequest is sent to.
 */
export const bidderUrl = env => url.format({
  protocol: (env === DEVELOPMENT) ? 'http' : 'https',
  hostname: domain(env),
  pathname: BIDDER_PATH
});

/**
 * Pure function.
 *
 * @param {string} env Emoteev environment parameter
 * @returns {string} The full URL called for iframe-based user sync
 */
export const userSyncIframeUrl = env => url.format({
  protocol: (env === DEVELOPMENT) ? 'http' : 'https',
  hostname: domain(env),
  pathname: USER_SYNC_IFRAME_PATH
});

/**
 * Pure function.
 *
 * @param {string} env Emoteev environment parameter
 * @returns {string} The full URL called for image-based user sync
 */
export const userSyncImageUrl = env => url.format({
  protocol: (env === DEVELOPMENT) ? 'http' : 'https',
  hostname: domain(env),
  pathname: USER_SYNC_IMAGE_PATH
});

/**
 * Pure function.
 *
 * @param {Array<Array<int>>} sizes
 * @returns {boolean} are sizes valid?
 */
export const validateSizes = sizes => isArray(sizes) && sizes.length > 0 && sizes.every(size => isArray(size) && size.length === 2);

/**
 * Pure function.
 *
 * @param {string} context
 * @returns {boolean} is param `context` valid?
 */
export const validateContext = context => contains([IN_CONTENT, FOOTER, OVERLAY, WALLPAPER], context);

/**
 * Pure function.
 *
 * @param {(number|null|undefined)} externalId
 * @returns {boolean} is param `externalId` valid?
 */
export const validateExternalId = externalId => externalId === undefined || externalId === null || (isInteger(externalId) && externalId > 0);

/**
 * Pure function.
 *
 * @param {BidRequest} bidRequest
 * @returns {object} An object which represents a BidRequest for Emoteev server side.
 */
export const conformBidRequest = bidRequest => {
  return {
    params: bidRequest.params,
    crumbs: bidRequest.crumbs,
    sizes: bidRequest.sizes,
    bidId: bidRequest.bidId,
    bidderRequestId: bidRequest.bidderRequestId,
  };
};

/**
 * Pure function.
 *
 * @param {object} bidderRequest
 * @returns {(boolean|undefined)} raw consent data.
 */
export const gdprConsent = (bidderRequest) => (deepAccess(bidderRequest, 'gdprConsent.vendorData.vendorConsents') || {})[VENDOR_ID];

/**
 * Pure function.
 *
 * @param {boolean} debug Pbjs debug parameter
 * @param {string} currency See http://prebid.org/dev-docs/modules/currency.html for detailed information
 * @param {BidRequest} validBidRequests
 * @param {object} bidderRequest
 * @returns
 */
export const requestsPayload = (debug, currency, validBidRequests, bidderRequest) => {
  return {
    akPbjsVersion: ADAPTER_VERSION,
    bidRequests: validBidRequests.map(conformBidRequest),
    currency: currency,
    debug: debug,
    language: navigator.language,
    refererInfo: bidderRequest.refererInfo,
    deviceInfo: getDeviceInfo(
      getDeviceDimensions(window),
      getViewDimensions(window, document),
      getDocumentDimensions(document),
      isWebGLEnabled(document)),
    userAgent: navigator.userAgent,
    gdprApplies: deepAccess(bidderRequest, 'gdprConsent.gdprApplies'),
    gdprConsent: gdprConsent(bidderRequest),
  };
};

/**
 * Pure function
 * @param {Window} window
 * @param {Document} document
 * @returns {{width: number, height: number}} View dimensions
 */
export const getViewDimensions = (window, document) => {
  let w = window;
  let prefix = 'inner';

  if (window.innerWidth === undefined || window.innerWidth === null) {
    w = document.documentElement || document.body;
    prefix = 'client';
  }

  return {
    width: w[`${prefix}Width`],
    height: w[`${prefix}Height`],
  };
};

/**
 * Pure function
 * @param {Window} window
 * @returns {{width: number, height: number}} Device dimensions
 */
export const getDeviceDimensions = (window) => {
  return {
    width: window.screen ? window.screen.width : '',
    height: window.screen ? window.screen.height : '',
  };
};

/**
 * Pure function
 * @param {Document} document
 * @returns {{width: number, height: number}} Document dimensions
 */
export const getDocumentDimensions = (document) => {
  const de = document.documentElement;
  const be = document.body;

  const bodyHeight = be ? Math.max(be.offsetHeight, be.scrollHeight) : 0;

  const w = Math.max(de.clientWidth, de.offsetWidth, de.scrollWidth);
  const h = Math.max(
    de.clientHeight,
    de.offsetHeight,
    de.scrollHeight,
    bodyHeight
  );

  return {
    width: isNaN(w) ? '' : w,
    height: isNaN(h) ? '' : h,
  };
};

/**
 * Unpure function
 * @param {Document} document
 * @returns {boolean} Is WebGL enabled?
 */
export const isWebGLEnabled = (document) => {
  // Create test canvas
  let canvas = document.createElement('canvas');

  // The gl context
  let gl = null;

  // Try to get the regular WebGL
  try {
    gl = canvas.getContext('webgl');
  } catch (ex) {
    canvas = undefined;
    return false;
  }

  // No regular WebGL found
  if (!gl) {
    // Try experimental WebGL
    try {
      gl = canvas.getContext('experimental-webgl');
    } catch (ex) {
      canvas = undefined;
      return false;
    }
  }

  return !!gl;
};

/**
 * Pure function
 * @param {{width: number, height: number}} deviceDimensions
 * @param {{width: number, height: number}} viewDimensions
 * @param {{width: number, height: number}} documentDimensions
 * @param {boolean} webGL
 * @returns {object} Device information
 */
export const getDeviceInfo = (deviceDimensions, viewDimensions, documentDimensions, webGL) => {
  return {
    browserWidth: viewDimensions.width,
    browserHeight: viewDimensions.height,
    deviceWidth: deviceDimensions.width,
    deviceHeight: deviceDimensions.height,
    documentWidth: documentDimensions.width,
    documentHeight: documentDimensions.height,
    webGL: webGL,
  };
};

/**
 * Pure function
 * @param {object} config pbjs config value
 * @param {string} parameter Environment override from URL query param.
 * @returns {string} One of [PRODUCTION, STAGING, DEVELOPMENT].
 */
export const resolveEnv = (config, parameter) => {
  const configEnv = deepAccess(config, 'emoteev.env');

  if (contains([PRODUCTION, STAGING, DEVELOPMENT], parameter)) return parameter;
  else if (contains([PRODUCTION, STAGING, DEVELOPMENT], configEnv)) return configEnv;
  else return DEFAULT_ENV;
};

/**
 * Pure function
 * @param {object} config pbjs config value
 * @param {string} parameter Debug override from URL query param.
 * @returns {boolean}
 */
export const resolveDebug = (config, parameter) => {
  if (parameter && parameter.length && parameter.length > 0) return JSON.parse(parameter);
  else if (config.debug) return config.debug;
  else return false;
};

/**
 * EmoteevBidAdapter spec
 * @access public
 * @type {BidderSpec}
 */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: isBidRequestValid,
  buildRequests: (validBidRequests, bidderRequest) =>
    buildRequests(
      resolveEnv(config.getConfig(), getParameterByName('emoteevEnv')),
      resolveDebug(config.getConfig(), getParameterByName('debug')),
      config.getConfig('currency'),
      validBidRequests,
      bidderRequest),
  interpretResponse: interpretResponse,
  onBidWon: (bidObject) =>
    triggerPixel(url.format(onBidWon(
      resolveEnv(config.getConfig(), getParameterByName('emoteevEnv')),
      getCookie('_pubcid'),
      bidObject))),
  onTimeout: (bidRequest) =>
    triggerPixel(url.format(onTimeout(
      resolveEnv(config.getConfig(), getParameterByName('emoteevEnv')),
      bidRequest))),
  getUserSyncs: (syncOptions) =>
    getUserSyncs(
      resolveEnv(config.getConfig(), getParameterByName('emoteevEnv')),
      syncOptions),
};

registerBidder(spec);
