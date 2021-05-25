import find from 'core-js-pure/features/array/find.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { loadExternalScript } from '../src/adloader.js';
import JSEncrypt from 'jsencrypt/bin/jsencrypt.js';
import sha256 from 'crypto-js/sha256.js';
import { getStorageManager } from '../src/storageManager.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { createEidsArray } from './userId/eids.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { OUTSTREAM } from '../src/video.js';

export const BIDDER_CODE = 'adagio';
export const LOG_PREFIX = 'Adagio:';
export const VERSION = '2.10.0';
export const FEATURES_VERSION = '1';
export const ENDPOINT = 'https://mp.4dex.io/prebid';
export const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
export const ADAGIO_TAG_URL = 'https://script.4dex.io/localstore.js';
export const ADAGIO_LOCALSTORAGE_KEY = 'adagioScript';
export const GVLID = 617;
export const storage = getStorageManager(GVLID, 'adagio');
export const RENDERER_URL = 'https://script.4dex.io/outstream-player.js';
export const MAX_SESS_DURATION = 30 * 60 * 1000;
export const ADAGIO_PUBKEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9el0+OEn6fvEh1RdVHQu4cnT0
jFSzIbGJJyg3cKqvtE6A0iaz9PkIdJIvSSSNrmJv+lRGKPEyRA/VnzJIieL39Ngl
t0b0lsHN+W4n9kitS/DZ/xnxWK/9vxhv0ZtL1LL/rwR5Mup7rmJbNtDoNBw4TIGj
pV6EP3MTLosuUEpLaQIDAQAB
-----END PUBLIC KEY-----`;

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

const EXT_DATA = {}

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

      var jsEncrypt = new JSEncrypt();
      jsEncrypt.setPublicKey(ADAGIO_PUBKEY);

      if (jsEncrypt.verify(content, hash, sha256)) {
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
      // ensure adagio removing for next time.
      // It's an antipattern regarding the TCF2 enforcement logic
      // but it's the only way to respect the user choice update.
      window.localStorage.removeItem(ADAGIO_LOCALSTORAGE_KEY);
      // Extra data from external script.
      // This key is removed only if localStorage is not accessible.
      window.localStorage.removeItem('adagio');
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

// Get localStorage "adagio" data to be passed to the request
export function prepareExchange(storageValue) {
  const adagioStorage = JSON.parse(storageValue, function(name, value) {
    if (!name.startsWith('_') || name === '') {
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

  utils.mergeDeep(EXT_DATA, adagioStorage, data);

  internal.enqueue({
    action: 'session',
    ts: Date.now(),
    data: EXT_DATA
  });
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
  w.ADAGIO.versions.adagioBidderAdapter = VERSION;
  w.ADAGIO.isSafeFrameWindow = isSafeFrameWindow();

  storage.getDataFromLocalStorage('adagio', (storageData) => {
    try {
      internal.prepareExchange(storageData);
    } catch (e) {
      utils.logError(LOG_PREFIX, e);
    }
  });

  getAdagioScript();
}

export const _features = {
  getPrintNumber(adUnitCode) {
    const adagioAdUnit = internal.getOrAddAdagioAdUnit(adUnitCode);
    return adagioAdUnit.printNumber || 1;
  },

  getPageDimensions() {
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
  },

  getViewPortDimensions() {
    if (!isSafeFrameWindow() && !canAccessTopWindow()) {
      return '';
    }

    const viewportDims = { w: 0, h: 0 };

    if (isSafeFrameWindow()) {
      const ws = utils.getWindowSelf();

      if (typeof ws.$sf.ext.geom !== 'function') {
        utils.logWarn(`${LOG_PREFIX} cannot use the $sf.ext.geom() safeFrame API method`);
        return '';
      }

      const sfGeom = ws.$sf.ext.geom().win;
      viewportDims.w = Math.round(sfGeom.w);
      viewportDims.h = Math.round(sfGeom.h);
    } else {
      // window.top based computing
      const wt = utils.getWindowTop();

      if (wt.innerWidth) {
        viewportDims.w = wt.innerWidth;
        viewportDims.h = wt.innerHeight;
      } else {
        const d = wt.document;
        const body = d.querySelector('body');

        if (!body) {
          return '';
        }

        viewportDims.w = d.querySelector('body').clientWidth;
        viewportDims.h = d.querySelector('body').clientHeight;
      }
    }

    return `${viewportDims.w}x${viewportDims.h}`;
  },

  /**
   * domLoading feature is computed on window.top if reachable.
   */
  getDomLoadingDuration() {
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
  },

  getSlotPosition(params) {
    const { adUnitElementId, postBid } = params;

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
        utils.logWarn(`${LOG_PREFIX} cannot use the $sf.ext.geom() safeFrame API method`);
        return '';
      }

      const sfGeom = ws.$sf.ext.geom().self;
      position.x = Math.round(sfGeom.t);
      position.y = Math.round(sfGeom.l);
    } else if (canAccessTopWindow()) {
      // window.top based computing
      const wt = utils.getWindowTop();
      const d = wt.document;

      let domElement;

      if (postBid === true) {
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
  },

  getTimestampUTC() {
    // timestamp returned in seconds
    return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
  },

  getDevice() {
    const ws = utils.getWindowSelf();
    const ua = ws.navigator.userAgent;

    if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
      return 5; // "tablet"
    }
    if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
      return 4; // "phone"
    }
    return 2; // personal computers
  },

  getBrowser() {
    const ws = utils.getWindowSelf();
    const ua = ws.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return /Edge\/\d./i.test(ua) ? 'edge' : uaLowerCase.indexOf('chrome') > 0 ? 'chrome' : uaLowerCase.indexOf('firefox') > 0 ? 'firefox' : uaLowerCase.indexOf('safari') > 0 ? 'safari' : uaLowerCase.indexOf('opera') > 0 ? 'opera' : uaLowerCase.indexOf('msie') > 0 || ws.MSStream ? 'ie' : 'unknow';
  },

  getOS() {
    const ws = utils.getWindowSelf();
    const ua = ws.navigator.userAgent;
    const uaLowerCase = ua.toLowerCase();
    return uaLowerCase.indexOf('linux') > 0 ? 'linux' : uaLowerCase.indexOf('mac') > 0 ? 'mac' : uaLowerCase.indexOf('win') > 0 ? 'windows' : '';
  },

  getUrl(refererInfo) {
    // top has not been reached, it means we are not sure
    // to get the proper page url.
    if (!refererInfo.reachedTop) {
      return;
    }
    return refererInfo.referer;
  },

  getUrlFromParams(params) {
    const { postBidOptions } = params;
    if (postBidOptions && postBidOptions.url) {
      return postBidOptions.url;
    }
  }
};

function enqueue(ob) {
  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.queue.push(ob);
};

function getOrAddAdagioAdUnit(adUnitCode) {
  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};

  if (w.ADAGIO.adUnits[adUnitCode]) {
    return w.ADAGIO.adUnits[adUnitCode];
  }

  return w.ADAGIO.adUnits[adUnitCode] = {};
};

function getPageviewId() {
  const w = internal.getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.pageviewId = w.ADAGIO.pageviewId || utils.generateUUID();

  return w.ADAGIO.pageviewId;
};

function computePrintNumber(adUnitCode) {
  let printNumber = 1;
  const w = internal.getCurrentWindow();

  if (
    w.ADAGIO &&
    w.ADAGIO.adUnits && w.ADAGIO.adUnits[adUnitCode] &&
    w.ADAGIO.adUnits[adUnitCode].pageviewId === internal.getPageviewId() &&
    w.ADAGIO.adUnits[adUnitCode].printNumber
  ) {
    printNumber = parseInt(w.ADAGIO.adUnits[adUnitCode].printNumber, 10) + 1;
  }

  return printNumber;
};

function getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    userAgent: navigator.userAgent,
    language: navigator[language],
    deviceType: _features.getDevice(),
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

function autoDetectAdUnitElementId(adUnitCode) {
  const autoDetectedAdUnit = utils.getGptSlotInfoForAdUnitCode(adUnitCode);
  let adUnitElementId = null;

  if (autoDetectedAdUnit && autoDetectedAdUnit.divId) {
    adUnitElementId = autoDetectedAdUnit.divId;
  }

  return adUnitElementId;
};

function autoDetectEnvironment() {
  const device = _features.getDevice();
  let environment;
  switch (device) {
    case 2:
      environment = 'desktop';
      break;
    case 4:
      environment = 'mobile';
      break;
    case 5:
      environment = 'tablet';
      break;
  };
  return environment;
};

function supportIObs() {
  const currentWindow = internal.getCurrentWindow();
  return !!(currentWindow && currentWindow.IntersectionObserver && currentWindow.IntersectionObserverEntry &&
    currentWindow.IntersectionObserverEntry.prototype && 'intersectionRatio' in currentWindow.IntersectionObserverEntry.prototype);
}

function getFeatures(bidRequest, bidderRequest) {
  const { adUnitCode, params } = bidRequest;
  const { adUnitElementId } = params;
  const { refererInfo } = bidderRequest;

  if (!adUnitElementId) {
    utils.logWarn(`${LOG_PREFIX} unable to get params.adUnitElementId. Continue without tiv.`);
  }

  const features = {
    print_number: _features.getPrintNumber(adUnitCode).toString(),
    page_dimensions: _features.getPageDimensions().toString(),
    viewport_dimensions: _features.getViewPortDimensions().toString(),
    dom_loading: _features.getDomLoadingDuration().toString(),
    // layout: features.getLayout().toString(),
    adunit_position: _features.getSlotPosition(params).toString(),
    user_timestamp: _features.getTimestampUTC().toString(),
    device: _features.getDevice().toString(),
    url: _features.getUrl(refererInfo) || _features.getUrlFromParams(params) || '',
    browser: _features.getBrowser(),
    os: _features.getOS()
  };

  Object.keys(features).forEach((prop) => {
    if (features[prop] === '') {
      delete features[prop];
    }
  });

  const adUnitFeature = {};

  adUnitFeature[adUnitElementId] = {
    features: features,
    version: FEATURES_VERSION
  };

  internal.enqueue({
    action: 'features',
    ts: Date.now(),
    data: adUnitFeature
  });

  return features;
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

export const internal = {
  enqueue,
  getOrAddAdagioAdUnit,
  getPageviewId,
  computePrintNumber,
  getDevice,
  getSite,
  getElementFromTopWindow,
  autoDetectAdUnitElementId,
  autoDetectEnvironment,
  getFeatures,
  getRefererInfo,
  adagioScriptFromLocalStorageCb,
  getCurrentWindow,
  supportIObs,
  canAccessTopWindow,
  isRendererPreferredFromPublisher,
  isNewSession,
  prepareExchange
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

  const consent = {};

  if (apiVersion !== undefined) {
    consent.apiVersion = apiVersion;
  }

  if (consentString !== undefined) {
    consent.consentString = consentString;
  }

  if (gdprApplies !== undefined) {
    consent.consentRequired = (gdprApplies) ? 1 : 0;
  }

  if (allowAuctionWithoutConsent !== undefined) {
    consent.allowAuctionWithoutConsent = allowAuctionWithoutConsent ? 1 : 0;
  }

  return consent;
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
  if (utils.deepAccess(bidRequest, 'schain')) {
    return bidRequest.schain;
  }
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
    bidRequest.mediaTypes.video.playerName = (internal.isRendererPreferredFromPublisher(bidRequest)) ? 'other' : 'adagio';

    if (bidRequest.mediaTypes.video.playerName === 'other') {
      utils.logWarn(`${LOG_PREFIX} renderer.backupOnly has not been set. Adagio recommends to use its own player to get expected behavior.`);
    }
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
    if (Array.isArray(bid.admNative.link.clickTrackers)) {
      native.clickTrackers = bid.admNative.link.clickTrackers
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

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid) {
    const { adUnitCode, auctionId, sizes, bidder, params, mediaTypes } = bid;
    if (!params) {
      utils.logWarn(`${LOG_PREFIX} the "params" property is missing.`);
      return false;
    }

    const { organizationId, site } = params;
    const adUnitElementId = (params.useAdUnitCodeAsAdUnitElementId === true)
      ? adUnitCode
      : params.adUnitElementId || internal.autoDetectAdUnitElementId(adUnitCode);
    const placement = (params.useAdUnitCodeAsPlacement === true) ? adUnitCode : params.placement;
    const environment = params.environment || internal.autoDetectEnvironment();
    const supportIObs = internal.supportIObs();

    // insure auto-detected params are kept in `bid` object.
    bid.params = {
      ...params,
      adUnitElementId,
      environment,
      placement,
      supportIObs
    };

    const debugData = () => ({
      action: 'pb-dbg',
      ts: Date.now(),
      data: {
        bid
      }
    });

    const refererInfo = internal.getRefererInfo();

    if (!refererInfo.reachedTop) {
      utils.logWarn(`${LOG_PREFIX} the main page url is unreachabled.`);
      internal.enqueue(debugData());

      return false;
    } else if (!(organizationId && site && placement)) {
      utils.logWarn(`${LOG_PREFIX} at least one required param is missing.`);
      internal.enqueue(debugData());

      return false;
    }

    const w = internal.getCurrentWindow();
    const pageviewId = internal.getPageviewId();
    const printNumber = internal.computePrintNumber(adUnitCode);

    // Store adUnits config.
    // If an adUnitCode has already been stored, it will be replaced.
    w.ADAGIO = w.ADAGIO || {};
    w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits.filter((adUnit) => adUnit.code !== adUnitCode);
    w.ADAGIO.pbjsAdUnits.push({
      code: adUnitCode,
      mediaTypes: mediaTypes || {},
      sizes: (mediaTypes && mediaTypes.banner && Array.isArray(mediaTypes.banner.sizes)) ? mediaTypes.banner.sizes : sizes,
      bids: [{
        bidder,
        params: bid.params // use the updated bid.params object with auto-detected params
      }],
      auctionId,
      pageviewId,
      printNumber
    });

    // (legacy) Store internal adUnit information
    w.ADAGIO.adUnits[adUnitCode] = {
      auctionId,
      pageviewId,
      printNumber,
    };

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
      bidRequest.features = internal.getFeatures(bidRequest, bidderRequest);

      if (utils.deepAccess(bidRequest, 'mediaTypes.video')) {
        _buildVideoBidRequest(bidRequest);
      }

      return bidRequest;
    });

    // Group ad units by organizationId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
      adUnit.params.organizationId = adUnit.params.organizationId.toString();

      groupedAdUnits[adUnit.params.organizationId] = groupedAdUnits[adUnit.params.organizationId] || [];
      groupedAdUnits[adUnit.params.organizationId].push(adUnit);

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
          data: EXT_DATA,
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
          adapterVersion: VERSION,
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
};

initAdagio();

registerBidder(spec);
