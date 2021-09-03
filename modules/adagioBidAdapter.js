import find from 'core-js-pure/features/array/find.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { loadExternalScript } from '../src/adloader.js';
import { verify } from 'criteo-direct-rsa-validate/build/verify.js';
import { getStorageManager } from '../src/storageManager.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { createEidsArray } from './userId/eids.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { OUTSTREAM } from '../src/video.js';
const BIDDER_CODE = 'adagio';
const LOG_PREFIX = 'Adagio:';
const FEATURES_VERSION = '1';
export const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
const ADAGIO_TAG_URL = 'https://script.4dex.io/localstore.js';
const ADAGIO_LOCALSTORAGE_KEY = 'adagioScript';
const GVLID = 617;
export const storage = getStorageManager(GVLID, 'adagio');
export const RENDERER_URL = 'https://script.4dex.io/outstream-player.js';
const MAX_SESS_DURATION = 30 * 60 * 1000;
const ADAGIO_PUBKEY = 'AL16XT44Sfp+8SHVF1UdC7hydPSMVLMhsYknKDdwqq+0ToDSJrP0+Qh0ki9JJI2uYm/6VEYo8TJED9WfMkiJ4vf02CW3RvSWwc35bif2SK1L8Nn/GfFYr/2/GG/Rm0vUsv+vBHky6nuuYls20Og0HDhMgaOlXoQ/cxMuiy5QSktp';
const ADAGIO_PUBKEY_E = 65537;
const CURRENCY = 'USD';
const DEFAULT_FLOOR = 0.1;

// This provide a whitelist and a basic validation
// of OpenRTB 2.5 options used by the Adagio SSP.
// https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf
export const ORTB_VIDEO_PARAMS = {
  'mimes': (value) => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string'),
  'minduration': (value) => utils.isInteger(value),
  'maxduration': (value) => utils.isInteger(value),
  'protocols': (value) => Array.isArray(value) && value.every(v => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].indexOf(v) !== -1),
  'w': (value) => utils.isInteger(value),
  'h': (value) => utils.isInteger(value),
  'startdelay': (value) => utils.isInteger(value),
  'placement': (value) => Array.isArray(value) && value.every(v => [1, 2, 3, 4, 5].indexOf(v) !== -1),
  'linearity': (value) => [1, 2].indexOf(value) !== -1,
  'skip': (value) => [0, 1].indexOf(value) !== -1,
  'skipmin': (value) => utils.isInteger(value),
  'skipafter': (value) => utils.isInteger(value),
  'sequence': (value) => utils.isInteger(value),
  'battr': (value) => Array.isArray(value) && value.every(v => Array.from({length: 17}, (_, i) => i + 1).indexOf(v) !== -1),
  'maxextended': (value) => utils.isInteger(value),
  'minbitrate': (value) => utils.isInteger(value),
  'maxbitrate': (value) => utils.isInteger(value),
  'boxingallowed': (value) => [0, 1].indexOf(value) !== -1,
  'playbackmethod': (value) => Array.isArray(value) && value.every(v => [1, 2, 3, 4, 5, 6].indexOf(v) !== -1),
  'playbackend': (value) => [1, 2, 3].indexOf(value) !== -1,
  'delivery': (value) => [1, 2, 3].indexOf(value) !== -1,
  'pos': (value) => [0, 1, 2, 3, 4, 5, 6, 7].indexOf(value) !== -1,
  'api': (value) => Array.isArray(value) && value.every(v => [1, 2, 3, 4, 5, 6].indexOf(v) !== -1)
};

let currentWindow;

export const GlobalExchange = (function() {
  let features;
  let exchangeData = {};

  return {
    clearFeatures: function() {
      features = undefined;
    },

    clearExchangeData: function() {
      exchangeData = {};
    },

    getOrSetGlobalFeatures: function () {
      if (!features) {
        features = {
          page_dimensions: getPageDimensions().toString(),
          viewport_dimensions: getViewPortDimensions().toString(),
          user_timestamp: getTimestampUTC().toString(),
          dom_loading: getDomLoadingDuration().toString(),
        }
      }
      return features;
    },

    prepareExchangeData(storageValue) {
      const adagioStorage = JSON.parse(storageValue, function(name, value) {
        if (name.charAt(0) !== '_' || name === '') {
          return value;
        }
      });
      let random = utils.deepAccess(adagioStorage, 'session.rnd');
      let newSession = false;

      if (internal.isNewSession(adagioStorage)) {
        newSession = true;
        random = Math.random();
      }

      const data = {
        session: {
          new: newSession,
          rnd: random
        }
      }

      utils.mergeDeep(exchangeData, adagioStorage, data);

      internal.enqueue({
        action: 'session',
        ts: Date.now(),
        data: exchangeData
      });
    },

    getExchangeData() {
      return exchangeData
    }
  };
})();

export function adagioScriptFromLocalStorageCb(ls) {
  try {
    if (!ls) {
      utils.logWarn(`${LOG_PREFIX} script not found.`);
      return;
    }

    const hashRgx = /^(\/\/ hash: (.+)\n)(.+\n)$/;

    if (!hashRgx.test(ls)) {
      utils.logWarn(`${LOG_PREFIX} no hash found.`);
      storage.removeDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);
    } else {
      const r = ls.match(hashRgx);
      const hash = r[2];
      const content = r[3];

      if (verify(content, hash, ADAGIO_PUBKEY, ADAGIO_PUBKEY_E)) {
        utils.logInfo(`${LOG_PREFIX} start script.`);
        Function(ls)(); // eslint-disable-line no-new-func
      } else {
        utils.logWarn(`${LOG_PREFIX} invalid script found.`);
        storage.removeDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);
      }
    }
  } catch (err) {
    utils.logError(LOG_PREFIX, err);
  }
}

export function getAdagioScript() {
  storage.getDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY, (ls) => {
    internal.adagioScriptFromLocalStorageCb(ls);
  });

  storage.localStorageIsEnabled(isValid => {
    if (isValid) {
      loadExternalScript(ADAGIO_TAG_URL, BIDDER_CODE);
    } else {
      // Try-catch to avoid error when 3rd party cookies is disabled (e.g. in privacy mode)
      try {
        // ensure adagio removing for next time.
        // It's an antipattern regarding the TCF2 enforcement logic
        // but it's the only way to respect the user choice update.
        window.localStorage.removeItem(ADAGIO_LOCALSTORAGE_KEY);
        // Extra data from external script.
        // This key is removed only if localStorage is not accessible.
        window.localStorage.removeItem('adagio');
      } catch (e) {
        utils.logInfo(`${LOG_PREFIX} unable to clear Adagio scripts from localstorage.`);
      }
    }
  });
}

function canAccessTopWindow() {
  try {
    if (utils.getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
}

function getCurrentWindow() {
  return currentWindow || utils.getWindowSelf();
}

function isSafeFrameWindow() {
  const ws = utils.getWindowSelf();
  return !!(ws.$sf && ws.$sf.ext);
}

function initAdagio() {
  if (canAccessTopWindow()) {
    currentWindow = (canAccessTopWindow()) ? utils.getWindowTop() : utils.getWindowSelf();
  }

  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.adUnits = w.ADAGIO.adUnits || {};
  w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits || [];
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.versions = w.ADAGIO.versions || {};
  w.ADAGIO.versions.pbjs = '$prebid.version$';
  w.ADAGIO.isSafeFrameWindow = isSafeFrameWindow();

  storage.getDataFromLocalStorage('adagio', (storageData) => {
    try {
      GlobalExchange.prepareExchangeData(storageData);
    } catch (e) {
      utils.logError(LOG_PREFIX, e);
    }
  });

  getAdagioScript();
}

function enqueue(ob) {
  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.queue.push(ob);
};

function getPageviewId() {
  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.pageviewId = w.ADAGIO.pageviewId || utils.generateUUID();

  return w.ADAGIO.pageviewId;
};

function getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    userAgent: navigator.userAgent,
    language: navigator[language],
    dnt: utils.getDNT() ? 1 : 0,
    geo: {},
    js: 1
  };
};

function getSite(bidderRequest) {
  let domain = '';
  let page = '';
  let referrer = '';

  const { refererInfo } = bidderRequest;

  if (canAccessTopWindow()) {
    const wt = utils.getWindowTop();
    domain = wt.location.hostname;
    page = wt.location.href;
    referrer = wt.document.referrer || '';
  } else if (refererInfo.reachedTop) {
    const url = utils.parseUrl(refererInfo.referer);
    domain = url.hostname;
    page = refererInfo.referer;
  } else if (refererInfo.stack && refererInfo.stack.length && refererInfo.stack[0]) {
    // important note check if refererInfo.stack[0] is 'thruly' because a `null` value
    // will be considered as "localhost" by the parseUrl function.
    // As the isBidRequestValid returns false when it does not reach the referer
    // this should never called.
    const url = utils.parseUrl(refererInfo.stack[0]);
    domain = url.hostname;
  }

  return {
    domain,
    page,
    referrer
  };
};

function getElementFromTopWindow(element, currentWindow) {
  try {
    if (utils.getWindowTop() === currentWindow) {
      if (!element.getAttribute('id')) {
        element.setAttribute('id', `adg-${utils.getUniqueIdentifierStr()}`);
      }
      return element;
    } else {
      const frame = currentWindow.frameElement;
      const frameClientRect = frame.getBoundingClientRect();
      const elementClientRect = element.getBoundingClientRect();

      if (frameClientRect.width !== elementClientRect.width || frameClientRect.height !== elementClientRect.height) {
        return false;
      }

      return getElementFromTopWindow(frame, currentWindow.parent);
    }
  } catch (err) {
    utils.logWarn(`${LOG_PREFIX}`, err);
    return false;
  }
};

function autoDetectAdUnitElementIdFromGpt(adUnitCode) {
  const autoDetectedAdUnit = utils.getGptSlotInfoForAdUnitCode(adUnitCode);

  if (autoDetectedAdUnit && autoDetectedAdUnit.divId) {
    return autoDetectedAdUnit.divId;
  }
};

function isRendererPreferredFromPublisher(bidRequest) {
  // renderer defined at adUnit level
  const adUnitRenderer = utils.deepAccess(bidRequest, 'renderer');
  const hasValidAdUnitRenderer = !!(adUnitRenderer && adUnitRenderer.url && adUnitRenderer.render);

  // renderer defined at adUnit.mediaTypes level
  const mediaTypeRenderer = utils.deepAccess(bidRequest, 'mediaTypes.video.renderer');
  const hasValidMediaTypeRenderer = !!(mediaTypeRenderer && mediaTypeRenderer.url && mediaTypeRenderer.render);

  return !!(
    (hasValidAdUnitRenderer && !(adUnitRenderer.backupOnly === true)) ||
    (hasValidMediaTypeRenderer && !(mediaTypeRenderer.backupOnly === true))
  );
}

/**
 *
 * @param {object} adagioStorage
 * @returns {boolean}
 */
function isNewSession(adagioStorage) {
  const now = Date.now();
  const { lastActivityTime, vwSmplg } = utils.deepAccess(adagioStorage, 'session', {});
  return (
    !utils.isNumber(lastActivityTime) ||
    !utils.isNumber(vwSmplg) ||
    (now - lastActivityTime) > MAX_SESS_DURATION
  )
}

function setPlayerName(bidRequest) {
  const playerName = (internal.isRendererPreferredFromPublisher(bidRequest)) ? 'other' : 'adagio';

  if (playerName === 'other') {
    utils.logWarn(`${LOG_PREFIX} renderer.backupOnly has not been set. Adagio recommends to use its own player to get expected behavior.`);
  }

  return playerName;
}

export const internal = {
  enqueue,
  getPageviewId,
  getDevice,
  getSite,
  getElementFromTopWindow,
  getRefererInfo,
  adagioScriptFromLocalStorageCb,
  getCurrentWindow,
  canAccessTopWindow,
  isRendererPreferredFromPublisher,
  isNewSession
};

function _getGdprConsent(bidderRequest) {
  if (!utils.deepAccess(bidderRequest, 'gdprConsent')) {
    return false;
  }

  const {
    apiVersion,
    gdprApplies,
    consentString,
    allowAuctionWithoutConsent
  } = bidderRequest.gdprConsent;

  return utils.cleanObj({
    apiVersion,
    consentString,
    consentRequired: gdprApplies ? 1 : 0,
    allowAuctionWithoutConsent: allowAuctionWithoutConsent ? 1 : 0
  });
}

function _getCoppa() {
  return {
    required: config.getConfig('coppa') === true ? 1 : 0
  };
}

function _getUspConsent(bidderRequest) {
  return (utils.deepAccess(bidderRequest, 'uspConsent')) ? { uspConsent: bidderRequest.uspConsent } : false;
}

function _getSchain(bidRequest) {
  return utils.deepAccess(bidRequest, 'schain');
}

function _getEids(bidRequest) {
  if (utils.deepAccess(bidRequest, 'userId')) {
    return createEidsArray(bidRequest.userId);
  }
}

function _buildVideoBidRequest(bidRequest) {
  const videoAdUnitParams = utils.deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = utils.deepAccess(bidRequest, 'params.video', {});
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

  if (videoParams.context && videoParams.context === OUTSTREAM) {
    bidRequest.mediaTypes.video.playerName = setPlayerName(bidRequest);
  }

  // Only whitelisted OpenRTB options need to be validated.
  // Other options will still remain in the `mediaTypes.video` object
  // sent in the ad-request, but will be ignored by the SSP.
  Object.keys(ORTB_VIDEO_PARAMS).forEach(paramName => {
    if (videoParams.hasOwnProperty(paramName)) {
      if (ORTB_VIDEO_PARAMS[paramName](videoParams[paramName])) {
        bidRequest.mediaTypes.video[paramName] = videoParams[paramName];
      } else {
        delete bidRequest.mediaTypes.video[paramName];
        utils.logWarn(`${LOG_PREFIX} The OpenRTB video param ${paramName} has been skipped due to misformating. Please refer to OpenRTB 2.5 spec.`);
      }
    }
  });
}

function _renderer(bid) {
  bid.renderer.push(() => {
    if (typeof window.ADAGIO.outstreamPlayer === 'function') {
      window.ADAGIO.outstreamPlayer(bid);
    } else {
      utils.logError(`${LOG_PREFIX} Adagio outstream player is not defined`);
    }
  });
}

function _parseNativeBidResponse(bid) {
  if (!bid.admNative || !Array.isArray(bid.admNative.assets)) {
    utils.logError(`${LOG_PREFIX} Invalid native response`);
    return;
  }

  const native = {}

  function addAssetDataValue(data) {
    const map = {
      1: 'sponsoredBy', // sponsored
      2: 'body', // desc
      3: 'rating',
      4: 'likes',
      5: 'downloads',
      6: 'price',
      7: 'salePrice',
      8: 'phone',
      9: 'address',
      10: 'body2', // desc2
      11: 'displayUrl',
      12: 'cta'
    }
    if (map.hasOwnProperty(data.type) && typeof data.value === 'string') {
      native[map[data.type]] = data.value;
    }
  }

  // assets
  bid.admNative.assets.forEach(asset => {
    if (asset.title) {
      native.title = asset.title.text
    } else if (asset.data) {
      addAssetDataValue(asset.data)
    } else if (asset.img) {
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
    }
  });

  if (bid.admNative.link) {
    if (bid.admNative.link.url) {
      native.clickUrl = bid.admNative.link.url;
    }
    if (Array.isArray(bid.admNative.link.clicktrackers)) {
      native.clickTrackers = bid.admNative.link.clicktrackers
    }
  }

  if (Array.isArray(bid.admNative.eventtrackers)) {
    native.impressionTrackers = [];
    bid.admNative.eventtrackers.forEach(tracker => {
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
          native.javascriptTrackers = `<script src=\"${tracker.url}\"></script>`;
          break;
      }
    });
  } else {
    native.impressionTrackers = Array.isArray(bid.admNative.imptrackers) ? bid.admNative.imptrackers : [];
    if (bid.admNative.jstracker) {
      native.javascriptTrackers = bid.admNative.jstracker;
    }
  }

  if (bid.admNative.privacy) {
    native.privacyLink = bid.admNative.privacy;
  }

  if (bid.admNative.ext) {
    native.ext = {}

    if (bid.admNative.ext.bvw) {
      native.ext.adagio_bvw = bid.admNative.ext.bvw;
    }
  }

  bid.native = native
}

function _getFloors(bidRequest) {
  if (!utils.isFn(bidRequest.getFloor)) {
    return false;
  }

  const floors = [];

  const getAndPush = (mediaType, size) => {
    const info = bidRequest.getFloor({
      currency: CURRENCY,
      mediaType,
      size: []
    });

    floors.push(utils.cleanObj({
      mt: mediaType,
      s: utils.isArray(size) ? `${size[0]}x${size[1]}` : undefined,
      f: (!isNaN(info.floor) && info.currency === CURRENCY) ? info.floor : DEFAULT_FLOOR
    }));
  }

  Object.keys(bidRequest.mediaTypes).forEach(mediaType => {
    if (SUPPORTED_MEDIA_TYPES.indexOf(mediaType) !== -1) {
      const sizeProp = mediaType === VIDEO ? 'playerSize' : 'sizes';

      if (bidRequest.mediaTypes[mediaType][sizeProp] && bidRequest.mediaTypes[mediaType][sizeProp].length) {
        if (utils.isArray(bidRequest.mediaTypes[mediaType][sizeProp][0])) {
          bidRequest.mediaTypes[mediaType][sizeProp].forEach(size => {
            getAndPush(mediaType, [size[0], size[1]]);
          });
        } else {
          getAndPush(mediaType, [bidRequest.mediaTypes[mediaType][sizeProp][0], bidRequest.mediaTypes[mediaType][sizeProp][1]]);
        }
      } else {
        getAndPush(mediaType, '*');
      }
    }
  });

  return floors;
}

/**
 * Try to find the value of `paramName` and set it to adUnit.params if
 * it has not already been set.
 * This function will check through:
 * - bidderSettings object
 * - ortb2.site.ext.data FPD…
 *
 * @param {*} bid
 * @param {String} paramName
 */
export function setExtraParam(bid, paramName) {
  bid.params = bid.params || {};

  // eslint-disable-next-line
  if (!!(bid.params[paramName])) {
    return;
  }

  const adgGlobalConf = config.getConfig('adagio') || {};
  const ortb2Conf = config.getConfig('ortb2');

  const detected = adgGlobalConf[paramName] || utils.deepAccess(ortb2Conf, `site.ext.data.${paramName}`, null);
  if (detected) {
    bid.params[paramName] = detected;
  }
}

function autoFillParams(bid) {
  // adUnitElementId …
  const adgGlobalConf = config.getConfig('adagio') || {};

  bid.params = bid.params || {};

  // adgGlobalConf.siteId is a shortcut to facilitate the integration for publisher.
  if (adgGlobalConf.siteId) {
    bid.params.organizationId = adgGlobalConf.siteId.split(':')[0];
    bid.params.site = adgGlobalConf.siteId.split(':')[1];
  }

  // Edge case. Useful when Prebid Manager cannot handle properly params setting…
  if (adgGlobalConf.useAdUnitCodeAsPlacement === true || bid.params.useAdUnitCodeAsPlacement === true) {
    bid.params.placement = bid.adUnitCode;
  }

  bid.params.adUnitElementId = utils.deepAccess(bid, 'ortb2Imp.ext.data.elementId', null) || bid.params.adUnitElementId;

  if (!bid.params.adUnitElementId) {
    if (adgGlobalConf.useAdUnitCodeAsAdUnitElementId === true || bid.params.useAdUnitCodeAsAdUnitElementId === true) {
      bid.params.adUnitElementId = bid.adUnitCode;
    } else {
      bid.params.adUnitElementId = autoDetectAdUnitElementIdFromGpt(bid.adUnitCode);
    }
  }

  // extra params
  setExtraParam(bid, 'environment');
  setExtraParam(bid, 'pagetype');
  setExtraParam(bid, 'category');
  setExtraParam(bid, 'subcategory');
}

function getPageDimensions() {
  if (isSafeFrameWindow() || !canAccessTopWindow()) {
    return '';
  }

  // the page dimension can be computed on window.top only.
  const wt = utils.getWindowTop();
  const body = wt.document.querySelector('body');

  if (!body) {
    return '';
  }
  const html = wt.document.documentElement;
  const pageWidth = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
  const pageHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

  return `${pageWidth}x${pageHeight}`;
}

/**
* @todo Move to prebid Core as Utils.
* @returns
*/
function getViewPortDimensions() {
  if (!isSafeFrameWindow() && !canAccessTopWindow()) {
    return '';
  }

  const viewportDims = { w: 0, h: 0 };

  if (isSafeFrameWindow()) {
    const ws = utils.getWindowSelf();

    if (typeof ws.$sf.ext.geom !== 'function') {
      utils.logWarn(LOG_PREFIX, 'Unable to compute from safeframe api.');
      return '';
    }

    const sfGeom = ws.$sf.ext.geom();

    if (!sfGeom || !sfGeom.win) {
      utils.logWarn(LOG_PREFIX, 'Unable to compute from safeframe api. Missing `geom().win` property');
      return '';
    }

    viewportDims.w = Math.round(sfGeom.w);
    viewportDims.h = Math.round(sfGeom.h);
  } else {
    // window.top based computing
    const wt = utils.getWindowTop();
    viewportDims.w = wt.innerWidth;
    viewportDims.h = wt.innerHeight;
  }

  return `${viewportDims.w}x${viewportDims.h}`;
}

function getSlotPosition(adUnitElementId) {
  if (!adUnitElementId) {
    return '';
  }

  if (!isSafeFrameWindow() && !canAccessTopWindow()) {
    return '';
  }

  const position = { x: 0, y: 0 };

  if (isSafeFrameWindow()) {
    const ws = utils.getWindowSelf();

    if (typeof ws.$sf.ext.geom !== 'function') {
      utils.logWarn(LOG_PREFIX, 'Unable to compute from safeframe api.');
      return '';
    }

    const sfGeom = ws.$sf.ext.geom();

    if (!sfGeom || !sfGeom.self) {
      utils.logWarn(LOG_PREFIX, 'Unable to compute from safeframe api. Missing `geom().self` property');
      return '';
    }

    position.x = Math.round(sfGeom.t);
    position.y = Math.round(sfGeom.l);
  } else if (canAccessTopWindow()) {
    // window.top based computing
    const wt = utils.getWindowTop();
    const d = wt.document;

    let domElement;

    if (utils.inIframe() === true) {
      const ws = utils.getWindowSelf();
      const currentElement = ws.document.getElementById(adUnitElementId);
      domElement = internal.getElementFromTopWindow(currentElement, ws);
    } else {
      domElement = wt.document.getElementById(adUnitElementId);
    }

    if (!domElement) {
      return '';
    }

    let box = domElement.getBoundingClientRect();

    const docEl = d.documentElement;
    const body = d.body;
    const clientTop = d.clientTop || body.clientTop || 0;
    const clientLeft = d.clientLeft || body.clientLeft || 0;
    const scrollTop = wt.pageYOffset || docEl.scrollTop || body.scrollTop;
    const scrollLeft = wt.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    const elComputedStyle = wt.getComputedStyle(domElement, null);
    const elComputedDisplay = elComputedStyle.display || 'block';
    const mustDisplayElement = elComputedDisplay === 'none';

    if (mustDisplayElement) {
      domElement.style = domElement.style || {};
      domElement.style.display = 'block';
      box = domElement.getBoundingClientRect();
      domElement.style.display = elComputedDisplay;
    }
    position.x = Math.round(box.left + scrollLeft - clientLeft);
    position.y = Math.round(box.top + scrollTop - clientTop);
  } else {
    return '';
  }

  return `${position.x}x${position.y}`;
}

function getTimestampUTC() {
  // timestamp returned in seconds
  return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
}

function getPrintNumber(adUnitCode, bidderRequest) {
  if (!bidderRequest.bids || !bidderRequest.bids.length) {
    return 1;
  }
  const adagioBid = find(bidderRequest.bids, bid => bid.adUnitCode === adUnitCode);
  return adagioBid.bidRequestsCount || 1;
}

/**
  * domLoading feature is computed on window.top if reachable.
  */
function getDomLoadingDuration() {
  let domLoadingDuration = -1;
  let performance;

  performance = (canAccessTopWindow()) ? utils.getWindowTop().performance : utils.getWindowSelf().performance;

  if (performance && performance.timing && performance.timing.navigationStart > 0) {
    const val = performance.timing.domLoading - performance.timing.navigationStart;
    if (val > 0) {
      domLoadingDuration = val;
    }
  }

  return domLoadingDuration;
}

function storeRequestInAdagioNS(bidRequest) {
  const w = getCurrentWindow();
  // Store adUnits config.
  // If an adUnitCode has already been stored, it will be replaced.
  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits.filter((adUnit) => adUnit.code !== bidRequest.adUnitCode);

  let printNumber
  if (bidRequest.features && bidRequest.features.print_number) {
    printNumber = bidRequest.features.print_number;
  } else if (bidRequest.params.features && bidRequest.params.features.print_number) {
    printNumber = bidRequest.params.features.print_number;
  }

  w.ADAGIO.pbjsAdUnits.push({
    code: bidRequest.adUnitCode,
    mediaTypes: bidRequest.mediaTypes || {},
    sizes: (bidRequest.mediaTypes && bidRequest.mediaTypes.banner && Array.isArray(bidRequest.mediaTypes.banner.sizes)) ? bidRequest.mediaTypes.banner.sizes : bidRequest.sizes,
    bids: [{
      bidder: bidRequest.bidder,
      params: bidRequest.params // use the updated bid.params object with auto-detected params
    }],
    auctionId: bidRequest.auctionId,
    pageviewId: internal.getPageviewId(),
    printNumber
  });

  // (legacy) Store internal adUnit information
  w.ADAGIO.adUnits[bidRequest.adUnitCode] = {
    auctionId: bidRequest.auctionId,
    pageviewId: internal.getPageviewId(),
    printNumber,
  };
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid) {
    bid.params = bid.params || {};

    autoFillParams(bid);

    if (!internal.getRefererInfo().reachedTop) {
      utils.logWarn(`${LOG_PREFIX} the main page url is unreachabled.`);
      // internal.enqueue(debugData());
      return false;
    }

    if (!(bid.params.organizationId && bid.params.site && bid.params.placement)) {
      utils.logWarn(`${LOG_PREFIX} at least one required param is missing.`);
      // internal.enqueue(debugData());
      return false;
    }

    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const secure = (location.protocol === 'https:') ? 1 : 0;
    const device = internal.getDevice();
    const site = internal.getSite(bidderRequest);
    const pageviewId = internal.getPageviewId();
    const gdprConsent = _getGdprConsent(bidderRequest) || {};
    const uspConsent = _getUspConsent(bidderRequest) || {};
    const coppa = _getCoppa();
    const schain = _getSchain(validBidRequests[0]);
    const eids = _getEids(validBidRequests[0]) || [];

    const adUnits = utils._map(validBidRequests, (bidRequest) => {
      const globalFeatures = GlobalExchange.getOrSetGlobalFeatures();
      const features = {
        ...globalFeatures,
        print_number: getPrintNumber(bidRequest.adUnitCode, bidderRequest).toString(),
        adunit_position: getSlotPosition(bidRequest.params.adUnitElementId) // adUnitElementId à déplacer ???
      };

      Object.keys(features).forEach((prop) => {
        if (features[prop] === '') {
          delete features[prop];
        }
      });

      bidRequest.features = features;

      internal.enqueue({
        action: 'features',
        ts: Date.now(),
        data: {
          features: bidRequest.features,
          params: bidRequest.params,
          adUnitCode: bidRequest.adUnitCode
        }
      });

      // Handle priceFloors module
      bidRequest.floors = _getFloors(bidRequest);

      if (utils.deepAccess(bidRequest, 'mediaTypes.video')) {
        _buildVideoBidRequest(bidRequest);
      }

      storeRequestInAdagioNS(bidRequest);

      return bidRequest;
    });

    // Group ad units by organizationId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
      const adUnitCopy = utils.deepClone(adUnit);
      adUnitCopy.params.organizationId = adUnitCopy.params.organizationId.toString();

      // remove useless props
      delete adUnitCopy.floorData;
      delete adUnitCopy.params.siteId;

      groupedAdUnits[adUnitCopy.params.organizationId] = groupedAdUnits[adUnitCopy.params.organizationId] || [];
      groupedAdUnits[adUnitCopy.params.organizationId].push(adUnitCopy);

      return groupedAdUnits;
    }, {});

    // Build one request per organizationId
    const requests = utils._map(Object.keys(groupedAdUnits), organizationId => {
      return {
        method: 'POST',
        url: ENDPOINT,
        data: {
          id: utils.generateUUID(),
          organizationId: organizationId,
          secure: secure,
          device: device,
          site: site,
          pageviewId: pageviewId,
          adUnits: groupedAdUnits[organizationId],
          data: GlobalExchange.getExchangeData(),
          regs: {
            gdpr: gdprConsent,
            coppa: coppa,
            ccpa: uspConsent
          },
          schain: schain,
          user: {
            eids: eids
          },
          prebidVersion: '$prebid.version$',
          featuresVersion: FEATURES_VERSION
        },
        options: {
          contentType: 'text/plain'
        }
      };
    });

    return requests;
  },

  interpretResponse(serverResponse, bidRequest) {
    let bidResponses = [];
    try {
      const response = serverResponse.body;
      if (response) {
        if (response.data) {
          internal.enqueue({
            action: 'ssp-data',
            ts: Date.now(),
            data: response.data
          });
        }
        if (response.bids) {
          response.bids.forEach(bidObj => {
            const bidReq = (find(bidRequest.data.adUnits, bid => bid.bidId === bidObj.requestId));

            if (bidReq) {
              bidObj.meta = utils.deepAccess(bidObj, 'meta', {});
              bidObj.meta.mediaType = bidObj.mediaType;
              bidObj.meta.advertiserDomains = (Array.isArray(bidObj.aDomain) && bidObj.aDomain.length) ? bidObj.aDomain : [];

              if (bidObj.mediaType === VIDEO) {
                const mediaTypeContext = utils.deepAccess(bidReq, 'mediaTypes.video.context');
                // Adagio SSP returns a `vastXml` only. No `vastUrl` nor `videoCacheKey`.
                if (!bidObj.vastUrl && bidObj.vastXml) {
                  bidObj.vastUrl = 'data:text/xml;charset=utf-8;base64,' + btoa(bidObj.vastXml.replace(/\\"/g, '"'));
                }

                if (mediaTypeContext === OUTSTREAM) {
                  bidObj.renderer = Renderer.install({
                    id: bidObj.requestId,
                    adUnitCode: bidObj.adUnitCode,
                    url: bidObj.urlRenderer || RENDERER_URL,
                    config: {
                      ...utils.deepAccess(bidReq, 'mediaTypes.video'),
                      ...utils.deepAccess(bidObj, 'outstream', {})
                    }
                  });

                  bidObj.renderer.setRender(_renderer);
                }
              }

              if (bidObj.mediaType === NATIVE) {
                _parseNativeBidResponse(bidObj);
              }

              bidObj.site = bidReq.params.site;
              bidObj.placement = bidReq.params.placement;
              bidObj.pagetype = bidReq.params.pagetype;
              bidObj.category = bidReq.params.category;
              bidObj.subcategory = bidReq.params.subcategory;
              bidObj.environment = bidReq.params.environment;
            }
            bidResponses.push(bidObj);
          });
        }
      }
    } catch (err) {
      utils.logError(err);
    }
    return bidResponses;
  },

  getUserSyncs(syncOptions, serverResponses) {
    if (!serverResponses.length || serverResponses[0].body === '' || !serverResponses[0].body.userSyncs) {
      return false;
    }

    const syncs = serverResponses[0].body.userSyncs.map(sync => ({
      type: sync.t === 'p' ? 'image' : 'iframe',
      url: sync.u
    }));

    return syncs;
  },

  /**
   * Handle custom logic in s2s context
   *
   * @param {*} params
   * @param {boolean} isOrtb Is an s2s context
   * @param {*} adUnit
   * @param {*} bidRequests
   * @returns {object} updated params
   */
  transformBidParams(params, isOrtb, adUnit, bidRequests) {
    const adagioBidderRequest = find(bidRequests, bidRequest => bidRequest.bidderCode === 'adagio');
    const adagioBid = find(adagioBidderRequest.bids, bid => bid.adUnitCode === adUnit.code);

    if (isOrtb) {
      autoFillParams(adagioBid);

      adagioBid.params.auctionId = utils.deepAccess(adagioBidderRequest, 'auctionId');

      const globalFeatures = GlobalExchange.getOrSetGlobalFeatures();
      adagioBid.params.features = {
        ...globalFeatures,
        print_number: getPrintNumber(adagioBid.adUnitCode, adagioBidderRequest).toString(),
        adunit_position: getSlotPosition(adagioBid.params.adUnitElementId) // adUnitElementId à déplacer ???
      }

      adagioBid.params.pageviewId = internal.getPageviewId();
      adagioBid.params.prebidVersion = '$prebid.version$';
      adagioBid.params.data = GlobalExchange.getExchangeData();

      if (utils.deepAccess(adagioBid, 'mediaTypes.video.context') === OUTSTREAM) {
        adagioBid.params.playerName = setPlayerName(adagioBid);
      }

      storeRequestInAdagioNS(adagioBid);
    }

    return adagioBid.params;
  }
};

initAdagio();

registerBidder(spec);
