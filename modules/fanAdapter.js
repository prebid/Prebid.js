import * as utils from '../src/utils.js';
import MD5 from 'crypto-js/md5.js';
import { ajax } from '../src/ajax.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { config } from '../src/config';
import { getGlobal } from '../src/prebidGlobal.js';
import { registerBidder } from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'freedomadnetwork';
const BASE_URL = 'https://srv.freedomadnetwork.com';

/**
 * Get user id from bid request. if no user id module used, return a new uuid.
 *
 * @param {BidRequest} bidRequest
 * @returns {String} userId
 */
function getUserId(bidRequest) {
  return generateUserId();
}

/**
 * Get browser language
 *
 * @returns {String} language
 */
function getLanguage() {
  const lang = (navigator.languages && navigator.languages[0]) ||
    navigator.language || navigator.userLanguage;
  return lang ? lang.split('-')[0] : DEFAULT_LANGUAGE;
}

/**
 * Get device info
 *
 * @returns {Object}
 */
function getDevice() {
  const device = config.getConfig('device') || {};

  device.w = device.w || window.screen.width;
  device.h = device.h || window.screen.height;
  device.ua = device.ua || navigator.userAgent;
  device.language = device.language || getLanguage();
  device.dnt = typeof device.dnt === 'number'
    ? device.dnt : (utils.getDNT() ? 1 : 0);

  return device;
}

/**
 * Build OpenRTB request from bidRequest and bidderRequest
 *
 * @param {BidRequest} bidRequest
 * @param {BidderRequest} bidderRequest
 * @returns {Request}
 */
function buildBidRequest(bid, bidderRequest) {
  const userId = getUserId(bid);

  const payload = {
    id: bid.bidId,
    tmax: bidderRequest.timeout,
    placements: [bid.params.placementId],
    test: config.getConfig('debug') ? 1 : 0,
    device: getDevice(),
    at: 2,
    user: {
      coppa: config.getConfig('coppa') ? 1 : 0,
      id: userId,
    }
  }

  const gdprConsent = utils.deepAccess(bidderRequest, 'gdprConsent');
  if (!!gdprConsent && gdprConsent.gdprApplies) {
    payload.user.gdpr = 1;
    payload.user.consent = gdprConsent.consentString;
  }

  const uspConsent = utils.deepAccess(bidderRequest, 'uspConsent');
  if (uspConsent) {
    payload.user.usp = uspConsent;
  }

  return {
    method: 'POST',
    url: BASE_URL + '/pb/req',
    data: JSON.stringify(payload),
    options: {
      contentType: 'application/json',
      withCredentials: false,
      customHeaders: {
        'Accept-Language': 'en;q=10',
        'Authorization': 'Bearer ' + userId
      },
    },
    originalBidRequest: bid
  }
}

/**
 * Generate stable viewport hash
 *
 * @returns {String} viewportHash
 */
function viewportHash() {
  var canvas = document.createElement('canvas');
  var gl =
    canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
  var hash = [];

  if (gl && gl.getExtension) {
    gl.ge = gl.getExtension;
    gl.gs = gl.getShaderPrecisionFormat;
    gl.gp = gl.getParameter;

    var debugInfo = gl.ge('WEBGL_debug_renderer_info');
    var drawBuffers = gl.ge('WEBGL_draw_buffers');
    var anisotropy =
      gl.ge('EXT_texture_filter_anisotropic') ||
      gl.ge('WEBKIT_EXT_texture_filter_anisotropic') ||
      gl.ge('MOZ_EXT_texture_filter_anisotropic');
    var vertex = [
      gl.gs(gl.VERTEX_SHADER, gl.HIGH_FLOAT),
      gl.gs(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT),
      gl.gs(gl.VERTEX_SHADER, gl.LOW_FLOAT),
    ];
    var frag = [
      gl.gs(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT),
      gl.gs(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT),
      gl.gs(gl.FRAGMENT_SHADER, gl.LOW_FLOAT),
    ];

    window.evg = debugInfo
      ? gl.gp(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.gp(gl.RENDERER);

    hash = [
      vertex,
      frag,
      gl.getContextAttributes().antialias,
      gl.gp(gl.VERSION),
      gl.gp(gl.SHADING_LANGUAGE_VERSION),
      gl.gp(gl.VENDOR),
      gl.gp(gl.ALIASED_LINE_WIDTH_RANGE),
      gl.gp(gl.RED_BITS),
      gl.gp(gl.GREEN_BITS),
      gl.gp(gl.BLUE_BITS),
      gl.gp(gl.ALPHA_BITS),
      gl.gp(gl.DEPTH_BITS),
      gl.gp(gl.STENCIL_BITS),
      gl.gp(gl.MAX_RENDERBUFFER_SIZE),
      gl.gp(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      gl.gp(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      gl.gp(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      gl.gp(gl.MAX_TEXTURE_IMAGE_UNITS),
      gl.gp(gl.MAX_TEXTURE_SIZE),
      gl.gp(gl.MAX_VARYING_VECTORS),
      gl.gp(gl.MAX_VERTEX_ATTRIBS),
      gl.gp(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      gl.gp(gl.MAX_VERTEX_UNIFORM_VECTORS),
      gl.gp(gl.ALIASED_LINE_WIDTH_RANGE),
      gl.gp(gl.ALIASED_POINT_SIZE_RANGE),
      gl.gp(gl.MAX_VIEWPORT_DIMS),
      gl.gs(gl.FRAGMENT_SHADER, gl.HIGH_INT),
      gl.getSupportedExtensions(),
      debugInfo ? gl.gp(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.gp(gl.RENDERER),
      drawBuffers ? gl.gp(drawBuffers.MAX_DRAW_BUFFERS_WEBGL) : 1,
      anisotropy ? gl.gp(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0,
    ];
  }

  return MD5(JSON.stringify(hash)).toString();
}

/**
 * Generate stable user id
 *
 * @returns {String} userId
 */
function generateUserId() {
  var flavors = [
    // Blink and some browsers on iOS
    'chrome',

    // Safari on macOS
    'safari',

    // Chrome on iOS (checked in 85 on 13 and 87 on 14)
    '__crWeb',
    '__gCrWeb',

    // Yandex Browser on iOS, macOS and Android (checked in 21.2 on iOS 14, macOS and Android)
    'yandex',

    // Yandex Browser on iOS (checked in 21.2 on 14)
    '__yb',
    '__ybro',

    // Firefox on iOS (checked in 32 on 14)
    '__firefox__',

    // Edge on iOS (checked in 46 on 14)
    '__edgeTrackingPreventionStatistics',
    'webkit',

    // Opera Touch on iOS (checked in 2.6 on 14)
    'oprt',

    // Samsung Internet on Android (checked in 11.1)
    'samsungAr',

    // UC Browser on Android (checked in 12.10 and 13.0)
    'ucweb',
    'UCShellJava',

    // Puffin on Android (checked in 9.0)
    'puffinDevice',
  ];

  var flavor = null;
  for (var i = 0; i < flavors.length; i++) {
    if (window[flavors[i]] && typeof window[flavors[i]] === 'object') {
      flavor = flavors[i];
    }
  }

  var screen = [
    parseInt(window.screen.width),
    parseInt(window.screen.height),
    window.screen.availHeight,
    window.screen.availWidth,
  ];

  var hash = [
    viewportHash(),
    flavor,
    navigator.webdriver,
    navigator.language ||
      navigator.userLanguage ||
      navigator.browserLanguage ||
      navigator.systemLanguage ||
      null,
    navigator.userAgent,
    window.screen.colorDepth,
    navigator.doNotTrack || navigator.msDoNotTrack || window.doNotTrack || null,
    navigator.maxTouchPoints || navigator.msMaxTouchPoints || null,
    navigator.vendor,
    navigator.cpuClass,
    navigator.oscpu,
    navigator.deviceMemory,
    navigator.hardwareConcurrency,
    navigator.languages,
    navigator.pdfViewerEnabled,
    navigator.plugins,
    window.chrome ? screen : null,
    window.matchMedia('(color-gamut: rec2020)').matches,
    window.matchMedia('(color-gamut: p3)').matches,
    window.matchMedia('(color-gamut: srgb)').matches,
    window.matchMedia('(prefers-contrast: no-preference)').matches,
    window.matchMedia('(prefers-contrast: more)').matches,
    window.matchMedia('(prefers-contrast: less)').matches,
    window.matchMedia('(prefers-contrast: custom)').matches,
    window.matchMedia('(inverted-colors: inverted)').matches,
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ];

  hash = MD5(JSON.stringify(hash)).toString();

  return hash;
}

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (!bid) {
      utils.logWarn(BIDDER_CODE, 'Invalid bid', bid);

      return false;
    }

    if (!bid.params) {
      utils.logWarn(BIDDER_CODE, 'bid.params is required');

      return false;
    }

    if (!bid.params.placementId) {
      utils.logWarn(BIDDER_CODE, 'bid.params.placementId is required');

      return false;
    }

    var banner = utils.deepAccess(bid, 'mediaTypes.banner');
    if (banner === undefined) {
      return false;
    }

    return true;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => buildBidRequest(bid, bidderRequest));
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    let bidResponses = [];

    serverBody.forEach((response) => {
      const bidResponse = {
        requestId: response.id,
        bidid: response.bidid,
        impid: response.impid,
        userId: response.userId,
        cpm: response.cpm,
        currency: response.currency,
        width: response.width,
        height: response.height,
        ad: response.payload,
        ttl: response.ttl,
        creativeId: response.crid,
        netRevenue: response.netRevenue,
        trackers: response.trackers,
        meta: {
          mediaType: response.mediaType,
          advertiserDomains: response.domains,
        }
      };

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   *
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    if (!bid) {
      return;
    }

    const payload = {
      id: bid.bidid,
      impid: bid.impid,
      t: bid.cpm,
    }

    ajax(BASE_URL + '/pb/imp', null, JSON.stringify(payload), {
      method: 'POST',
      customHeaders: {
        'Accept-Language': 'en;q=10',
        'Authorization': 'Bearer ' + bid.userId
      },
    });

    if (bid.trackers && bid.trackers.length > 0) {
      for (var i = 0; i < bid.trackers.length; i++) {
        if (bid.trackers[i].type == 0) {
          utils.triggerPixel(bid.trackers[i].url);
        }
      }
    }
  },
  onSetTargeting: function(bid) {},
  onBidderError: function(error) {
    console.log(error);
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {},
  onTimeout: function(timeoutData) {},
  supportedMediaTypes: [BANNER, NATIVE]
}

registerBidder(spec);
