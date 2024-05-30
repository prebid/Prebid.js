import {find} from '../src/polyfill.js';
import {
  canAccessWindowTop,
  cleanObj,
  deepAccess,
  deepClone,
  generateUUID,
  getDNT,
  getUniqueIdentifierStr,
  getWindowSelf,
  getWindowTop,
  isArray,
  isArrayOfNums,
  isFn,
  inIframe,
  isInteger,
  isNumber,
  isSafeFrameWindow,
  isStr,
  logError,
  logInfo,
  logWarn,
  mergeDeep,
} from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {loadExternalScript} from '../src/adloader.js';
import {verify} from 'criteo-direct-rsa-validate/build/verify.js';
import {getStorageManager} from '../src/storageManager.js';
import {getRefererInfo, parseDomain} from '../src/refererDetection.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {Renderer} from '../src/Renderer.js';
import {OUTSTREAM} from '../src/video.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { userSync } from '../src/userSync.js';
import {getGptSlotInfoForAdUnitCode} from '../libraries/gptUtils/gptUtils.js';

const BIDDER_CODE = 'adagio';
const LOG_PREFIX = 'Adagio:';
const FEATURES_VERSION = '1';
export const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO];
const ADAGIO_TAG_URL = 'https://script.4dex.io/localstore.js';
const ADAGIO_LOCALSTORAGE_KEY = 'adagioScript';
const GVLID = 617;
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

const BB_PUBLICATION = 'adagio';
const BB_RENDERER_DEFAULT = 'renderer';
export const BB_RENDERER_URL = `https://${BB_PUBLICATION}.bbvms.com/r/$RENDERER.js`;

const MAX_SESS_DURATION = 30 * 60 * 1000;
const ADAGIO_PUBKEY = 'AL16XT44Sfp+8SHVF1UdC7hydPSMVLMhsYknKDdwqq+0ToDSJrP0+Qh0ki9JJI2uYm/6VEYo8TJED9WfMkiJ4vf02CW3RvSWwc35bif2SK1L8Nn/GfFYr/2/GG/Rm0vUsv+vBHky6nuuYls20Og0HDhMgaOlXoQ/cxMuiy5QSktp';
const ADAGIO_PUBKEY_E = 65537;
const CURRENCY = 'USD';

// This provide a whitelist and a basic validation of OpenRTB 2.5 options used by the Adagio SSP.
// Accept all options but 'protocol', 'companionad', 'companiontype', 'ext'
// https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf
export const ORTB_VIDEO_PARAMS = {
  'mimes': (value) => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string'),
  'minduration': (value) => isInteger(value),
  'maxduration': (value) => isInteger(value),
  'protocols': (value) => isArrayOfNums(value),
  'w': (value) => isInteger(value),
  'h': (value) => isInteger(value),
  'startdelay': (value) => isInteger(value),
  'placement': (value) => {
    logWarn(LOG_PREFIX, 'The OpenRTB video param `placement` is deprecated and should not be used anymore.');
    return isInteger(value)
  },
  'plcmt': (value) => isInteger(value),
  'linearity': (value) => isInteger(value),
  'skip': (value) => [1, 0].includes(value),
  'skipmin': (value) => isInteger(value),
  'skipafter': (value) => isInteger(value),
  'sequence': (value) => isInteger(value),
  'battr': (value) => isArrayOfNums(value),
  'maxextended': (value) => isInteger(value),
  'minbitrate': (value) => isInteger(value),
  'maxbitrate': (value) => isInteger(value),
  'boxingallowed': (value) => isInteger(value),
  'playbackmethod': (value) => isArrayOfNums(value),
  'playbackend': (value) => isInteger(value),
  'delivery': (value) => isArrayOfNums(value),
  'pos': (value) => isInteger(value),
  'api': (value) => isArrayOfNums(value)
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
          type: 'bidAdapter',
          page_dimensions: getPageDimensions().toString(),
          viewport_dimensions: getViewPortDimensions().toString(),
          user_timestamp: getTimestampUTC().toString(),
          dom_loading: getDomLoadingDuration().toString(),
        }
      }

      return { ...features };
    },

    prepareExchangeData(storageValue) {
      const adagioStorage = JSON.parse(storageValue, function(name, value) {
        if (name.charAt(0) !== '_' || name === '') {
          return value;
        }
      });
      let random = deepAccess(adagioStorage, 'session.rnd');
      let newSession = false;

      if (internal.isNewSession(adagioStorage)) {
        newSession = true;
        random = Math.random();
      }

      const data = {
        session: {
          new: newSession,
          rnd: random,
        }
      }

      mergeDeep(exchangeData, adagioStorage, data);

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

/**
 * @deprecated will be removed in Prebid.js 9.
 */
export function adagioScriptFromLocalStorageCb(ls) {
  try {
    if (!ls) {
      logWarn(`${LOG_PREFIX} script not found.`);
      return;
    }

    const hashRgx = /^(\/\/ hash: (.+)\n)(.+\n)$/;

    if (!hashRgx.test(ls)) {
      logWarn(`${LOG_PREFIX} no hash found.`);
      storage.removeDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);
    } else {
      const r = ls.match(hashRgx);
      const hash = r[2];
      const content = r[3];

      if (verify(content, hash, ADAGIO_PUBKEY, ADAGIO_PUBKEY_E)) {
        logInfo(`${LOG_PREFIX} start script.`);
        Function(ls)(); // eslint-disable-line no-new-func
      } else {
        logWarn(`${LOG_PREFIX} invalid script found.`);
        storage.removeDataFromLocalStorage(ADAGIO_LOCALSTORAGE_KEY);
      }
    }
  } catch (err) {
    logError(LOG_PREFIX, err);
  }
}

/**
 * @deprecated will be removed in Prebid.js 9.
 */
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
        logInfo(`${LOG_PREFIX} unable to clear Adagio scripts from localstorage.`);
      }
    }
  });
}

function getCurrentWindow() {
  return currentWindow || getWindowSelf();
}

function initAdagio() {
  currentWindow = (canAccessWindowTop()) ? getWindowTop() : getWindowSelf();

  const w = currentWindow;

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.adUnits = w.ADAGIO.adUnits || {};
  w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits || [];
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.versions = w.ADAGIO.versions || {};
  w.ADAGIO.versions.pbjs = '$prebid.version$';
  w.ADAGIO.isSafeFrameWindow = isSafeFrameWindow();

  storage.getDataFromLocalStorage('adagio', (storageData) => {
    try {
      if (w.ADAGIO.hasRtd !== true) {
        logInfo(`${LOG_PREFIX} RTD module not found. Loading external script from adagioBidAdapter is deprecated and will be removed in Prebid.js 9.`);

        GlobalExchange.prepareExchangeData(storageData);
        getAdagioScript();
      }
    } catch (e) {
      logError(LOG_PREFIX, e);
    }
  });
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
  w.ADAGIO.pageviewId = w.ADAGIO.pageviewId || generateUUID();

  return w.ADAGIO.pageviewId;
};

function getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    userAgent: navigator.userAgent,
    language: navigator[language],
    dnt: getDNT() ? 1 : 0,
    geo: {},
    js: 1
  };
};

function getSite(bidderRequest) {
  const { refererInfo } = bidderRequest;
  return {
    domain: parseDomain(refererInfo.topmostLocation) || '',
    page: refererInfo.topmostLocation || '',
    referrer: refererInfo.ref || getWindowSelf().document.referrer || '',
    top: refererInfo.reachedTop
  };
};

function getElementFromTopWindow(element, currentWindow) {
  try {
    if (getWindowTop() === currentWindow) {
      if (!element.getAttribute('id')) {
        element.setAttribute('id', `adg-${getUniqueIdentifierStr()}`);
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
    logWarn(`${LOG_PREFIX}`, err);
    return false;
  }
};

function autoDetectAdUnitElementIdFromGpt(adUnitCode) {
  const autoDetectedAdUnit = getGptSlotInfoForAdUnitCode(adUnitCode);

  if (autoDetectedAdUnit.divId) {
    return autoDetectedAdUnit.divId;
  }
};

function isRendererPreferredFromPublisher(bidRequest) {
  // renderer defined at adUnit level
  const adUnitRenderer = deepAccess(bidRequest, 'renderer');
  const hasValidAdUnitRenderer = !!(adUnitRenderer && adUnitRenderer.url && adUnitRenderer.render);

  // renderer defined at adUnit.mediaTypes level
  const mediaTypeRenderer = deepAccess(bidRequest, 'mediaTypes.video.renderer');
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
  const { lastActivityTime, vwSmplg } = deepAccess(adagioStorage, 'session', {});
  return (
    !isNumber(lastActivityTime) ||
    !isNumber(vwSmplg) ||
    (now - lastActivityTime) > MAX_SESS_DURATION
  )
}

function setPlayerName(bidRequest) {
  const playerName = (internal.isRendererPreferredFromPublisher(bidRequest)) ? 'other' : 'adagio';

  if (playerName === 'other') {
    logWarn(`${LOG_PREFIX} renderer.backupOnly has not been set. Adagio recommends to use its own player to get expected behavior.`);
  }

  return playerName;
}

function hasRtd() {
  const w = internal.getCurrentWindow();

  return !!(w.ADAGIO && w.ADAGIO.hasRtd);
};

export const internal = {
  enqueue,
  getPageviewId,
  getDevice,
  getSite,
  getElementFromTopWindow,
  getRefererInfo,
  adagioScriptFromLocalStorageCb,
  getCurrentWindow,
  canAccessWindowTop,
  isRendererPreferredFromPublisher,
  isNewSession,
  hasRtd
};

function _getGdprConsent(bidderRequest) {
  if (!deepAccess(bidderRequest, 'gdprConsent')) {
    return false;
  }

  const {
    apiVersion,
    gdprApplies,
    consentString,
    allowAuctionWithoutConsent
  } = bidderRequest.gdprConsent;

  return cleanObj({
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
  return (deepAccess(bidderRequest, 'uspConsent')) ? { uspConsent: bidderRequest.uspConsent } : false;
}

function _getGppConsent(bidderRequest) {
  let gpp = deepAccess(bidderRequest, 'gppConsent.gppString')
  let gppSid = deepAccess(bidderRequest, 'gppConsent.applicableSections')

  if (!gpp || !gppSid) {
    gpp = deepAccess(bidderRequest, 'ortb2.regs.gpp', '')
    gppSid = deepAccess(bidderRequest, 'ortb2.regs.gpp_sid', [])
  }
  return { gpp, gppSid }
}

function _getSchain(bidRequest) {
  return deepAccess(bidRequest, 'schain');
}

function _getEids(bidRequest) {
  if (deepAccess(bidRequest, 'userIdAsEids')) {
    return bidRequest.userIdAsEids;
  }
}

function _buildVideoBidRequest(bidRequest) {
  const videoAdUnitParams = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});
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
        logWarn(`${LOG_PREFIX} The OpenRTB video param ${paramName} has been skipped due to misformating. Please refer to OpenRTB 2.5 spec.`);
      }
    }
  });
}

function _parseNativeBidResponse(bid) {
  if (!bid.admNative || !Array.isArray(bid.admNative.assets)) {
    logError(`${LOG_PREFIX} Invalid native response`);
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
          const script = `<script async src=\"${tracker.url}\"></script>`;
          if (!native.javascriptTrackers) {
            native.javascriptTrackers = script;
          } else {
            native.javascriptTrackers += `\n${script}`;
          }
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

// bidRequest param must be the `bidRequest` object with the original `auctionId` value.
function _getFloors(bidRequest) {
  if (!isFn(bidRequest.getFloor)) {
    return false;
  }

  const floors = [];

  const getAndPush = (mediaType, size) => {
    const info = bidRequest.getFloor({
      currency: CURRENCY,
      mediaType,
      size
    });

    floors.push(cleanObj({
      mt: mediaType,
      s: isArray(size) ? `${size[0]}x${size[1]}` : undefined,
      f: (!isNaN(info.floor) && info.currency === CURRENCY) ? info.floor : undefined
    }));
  }

  Object.keys(bidRequest.mediaTypes).forEach(mediaType => {
    if (SUPPORTED_MEDIA_TYPES.indexOf(mediaType) !== -1) {
      const sizeProp = mediaType === VIDEO ? 'playerSize' : 'sizes';

      if (bidRequest.mediaTypes[mediaType][sizeProp] && bidRequest.mediaTypes[mediaType][sizeProp].length) {
        if (isArray(bidRequest.mediaTypes[mediaType][sizeProp][0])) {
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
  const ortb2Conf = bid.ortb2;

  const detected = adgGlobalConf[paramName] || deepAccess(ortb2Conf, `site.ext.data.${paramName}`, null);
  if (detected) {
    // First Party Data can be an array.
    // As we consider that params detected from FPD are fallbacks, we just keep the 1st value.
    if (Array.isArray(detected)) {
      if (detected.length) {
        bid.params[paramName] = detected[0].toString();
      }
      return;
    }

    bid.params[paramName] = detected.toString();
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

  // `useAdUnitCodeAsPlacement` is an edge case. Useful when a Prebid Manager cannot handle properly params setting.
  // In Prebid.js 9, `placement` should be defined in ortb2Imp and the `useAdUnitCodeAsPlacement` param should be removed
  bid.params.placement = deepAccess(bid, 'ortb2Imp.ext.data.placement', bid.params.placement);
  if (!bid.params.placement && (adgGlobalConf.useAdUnitCodeAsPlacement === true || bid.params.useAdUnitCodeAsPlacement === true)) {
    bid.params.placement = bid.adUnitCode;
  }

  bid.params.adUnitElementId = deepAccess(bid, 'ortb2Imp.ext.data.divId', bid.params.adUnitElementId);
  if (!bid.params.adUnitElementId) {
    if (adgGlobalConf.useAdUnitCodeAsAdUnitElementId === true || bid.params.useAdUnitCodeAsAdUnitElementId === true) {
      bid.params.adUnitElementId = bid.adUnitCode;
    } else {
      bid.params.adUnitElementId = autoDetectAdUnitElementIdFromGpt(bid.adUnitCode);
    }
  }

  // extra params
  setExtraParam(bid, 'pagetype');
  setExtraParam(bid, 'category');
}

function getPageDimensions() {
  if (isSafeFrameWindow() || !canAccessWindowTop()) {
    return '';
  }

  // the page dimension can be computed on window.top only.
  const wt = getWindowTop();
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
  if (!isSafeFrameWindow() && !canAccessWindowTop()) {
    return '';
  }

  const viewportDims = { w: 0, h: 0 };

  if (isSafeFrameWindow()) {
    const ws = getWindowSelf();

    if (typeof ws.$sf.ext.geom !== 'function') {
      logWarn(LOG_PREFIX, 'Unable to compute from safeframe api.');
      return '';
    }

    const sfGeom = ws.$sf.ext.geom();

    if (!sfGeom || !sfGeom.win) {
      logWarn(LOG_PREFIX, 'Unable to compute from safeframe api. Missing `geom().win` property');
      return '';
    }

    viewportDims.w = Math.round(sfGeom.w);
    viewportDims.h = Math.round(sfGeom.h);
  } else {
    // window.top based computing
    const wt = getWindowTop();
    viewportDims.w = wt.innerWidth;
    viewportDims.h = wt.innerHeight;
  }

  return `${viewportDims.w}x${viewportDims.h}`;
}

function getSlotPosition(adUnitElementId) {
  if (!adUnitElementId) {
    return '';
  }

  if (!isSafeFrameWindow() && !canAccessWindowTop()) {
    return '';
  }

  const position = { x: 0, y: 0 };

  if (isSafeFrameWindow()) {
    const ws = getWindowSelf();

    if (typeof ws.$sf.ext.geom !== 'function') {
      logWarn(LOG_PREFIX, 'Unable to compute from safeframe api.');
      return '';
    }

    const sfGeom = ws.$sf.ext.geom();

    if (!sfGeom || !sfGeom.self) {
      logWarn(LOG_PREFIX, 'Unable to compute from safeframe api. Missing `geom().self` property');
      return '';
    }

    position.x = Math.round(sfGeom.t);
    position.y = Math.round(sfGeom.l);
  } else if (canAccessWindowTop()) {
    try {
      // window.top based computing
      const wt = getWindowTop();
      const d = wt.document;

      let domElement;

      if (inIframe() === true) {
        const ws = getWindowSelf();
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
      const mustDisplayElement = elComputedStyle.display === 'none';

      if (mustDisplayElement) {
        logWarn(LOG_PREFIX, 'The element is hidden. The slot position cannot be computed.');
      }

      position.x = Math.round(box.left + scrollLeft - clientLeft);
      position.y = Math.round(box.top + scrollTop - clientTop);
    } catch (err) {
      logError(LOG_PREFIX, err);
      return '';
    }
  } else {
    return '';
  }

  return `${position.x}x${position.y}`;
}

function getTimestampUTC() {
  // timestamp returned in seconds
  return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
}

/**
 * domLoading feature is computed on window.top if reachable.
 */
function getDomLoadingDuration() {
  let domLoadingDuration = -1;
  let performance;

  performance = (canAccessWindowTop()) ? getWindowTop().performance : getWindowSelf().performance;

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
    auctionId: bidRequest.auctionId, // this auctionId has been generated by adagioBidAdapter
    pageviewId: internal.getPageviewId(),
    printNumber,
    localPbjs: '$$PREBID_GLOBAL$$',
    localPbjsRef: getGlobal()
  });

  // (legacy) Store internal adUnit information
  w.ADAGIO.adUnits[bidRequest.adUnitCode] = {
    auctionId: bidRequest.auctionId, // this auctionId has been generated by adagioBidAdapter
    pageviewId: internal.getPageviewId(),
    printNumber,
  };
}

// See https://support.bluebillywig.com/developers/vast-renderer/
const OUTSTREAM_RENDERER = {
  bootstrapPlayer: function(bid) {
    const rendererCode = bid.outstreamRendererCode;

    const config = {
      code: bid.adUnitCode,
    };

    if (bid.vastXml) {
      config.vastXml = bid.vastXml;
    } else if (bid.vastUrl) {
      config.vastUrl = bid.vastUrl;
    }

    if (!bid.vastXml && !bid.vastUrl) {
      logError(`${LOG_PREFIX} no vastXml or vastUrl on bid`);
      return;
    }

    if (!window.bluebillywig || !window.bluebillywig.renderers || !window.bluebillywig.renderers.length) {
      logError(`${LOG_PREFIX} no BlueBillywig renderers found!`);
      return;
    }

    const rendererId = this.getRendererId(BB_PUBLICATION, rendererCode);

    const override = {}
    if (bid.skipOffset) {
      override.skipOffset = bid.skipOffset.toString()
    }

    const renderer = window.bluebillywig.renderers.find(bbr => bbr._id === rendererId);
    if (!renderer) {
      logError(`${LOG_PREFIX} couldn't find a renderer with ID ${rendererId}`);
      return;
    }

    const el = document.getElementById(bid.adUnitCode);

    renderer.bootstrap(config, el, override);
  },
  newRenderer: function(adUnitCode, rendererCode) {
    const rendererUrl = BB_RENDERER_URL.replace('$RENDERER', rendererCode);

    const renderer = Renderer.install({
      url: rendererUrl,
      loaded: false,
      adUnitCode
    });

    try {
      renderer.setRender(this.outstreamRender);
    } catch (err) {
      logError(`${LOG_PREFIX} error trying to setRender`, err);
    }

    return renderer;
  },
  outstreamRender: function(bid) {
    bid.renderer.push(() => {
      OUTSTREAM_RENDERER.bootstrapPlayer(bid)
    });
  },
  getRendererId: function(publication, renderer) {
    // By convention, the RENDERER_ID is always the publication name (adagio) and the ad unit code (eg. renderer)
    // joined together by a dash. It's used to identify the correct renderer instance on the page in case there's multiple.
    return `${publication}-${renderer}`;
  }
};

/**
 *
 * @param {*} bidRequest
 * @returns
 */
const _getFeatures = (bidRequest) => {
  const f = { ...deepAccess(bidRequest, 'ortb2.site.ext.data.adg_rtd.features', GlobalExchange.getOrSetGlobalFeatures()) } || {};

  f.print_number = deepAccess(bidRequest, 'bidderRequestsCount', 1).toString();

  if (f.type === 'bidAdapter') {
    f.adunit_position = getSlotPosition(bidRequest.params.adUnitElementId)
  } else {
    f.adunit_position = deepAccess(bidRequest, 'ortb2Imp.ext.data.adg_rtd.adunit_position');
  }

  Object.keys(f).forEach((prop) => {
    if (f[prop] === '') {
      delete f[prop];
    }
  });

  return f;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid) {
    bid.params = bid.params || {};

    autoFillParams(bid);

    // Note: `bid.params.placement` is not related to the video param `placement`.
    if (!(bid.params.organizationId && bid.params.site && bid.params.placement)) {
      logWarn(`${LOG_PREFIX} at least one required param is missing.`);
      // internal.enqueue(debugData());
      return false;
    }

    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const secure = (location.protocol === 'https:') ? 1 : 0;
    const device = internal.getDevice();
    const site = internal.getSite(bidderRequest);
    const pageviewId = internal.getPageviewId();
    const hasRtd = internal.hasRtd();
    const gdprConsent = _getGdprConsent(bidderRequest) || {};
    const uspConsent = _getUspConsent(bidderRequest) || {};
    const coppa = _getCoppa();
    const gppConsent = _getGppConsent(bidderRequest)
    const schain = _getSchain(validBidRequests[0]);
    const eids = _getEids(validBidRequests[0]) || [];
    const syncEnabled = deepAccess(config.getConfig('userSync'), 'syncEnabled')
    const usIfr = syncEnabled && userSync.canBidderRegisterSync('iframe', 'adagio')

    // We don't validate the dsa object in adapter and let our server do it.
    const dsa = deepAccess(bidderRequest, 'ortb2.regs.ext.dsa');

    let rtdSamplingSession = deepAccess(bidderRequest, 'ortb2.site.ext.data.adg_rtd.session');
    const dataExchange = (rtdSamplingSession) ? { session: rtdSamplingSession } : GlobalExchange.getExchangeData();

    const aucId = generateUUID()

    const adUnits = validBidRequests.map(rawBidRequest => {
      const bidRequest = deepClone(rawBidRequest);

      // Fix https://github.com/prebid/Prebid.js/issues/9781
      bidRequest.auctionId = aucId

      // Force the Split Keyword to be a String
      if (bidRequest.params.splitKeyword) {
        if (isStr(bidRequest.params.splitKeyword) || isNumber(bidRequest.params.splitKeyword)) {
          bidRequest.params.splitKeyword = bidRequest.params.splitKeyword.toString();
        } else {
          delete bidRequest.params.splitKeyword;

          logWarn(LOG_PREFIX, 'The splitKeyword param have been removed because the type is invalid, accepted type: number or string.');
        }
      }

      // Enforce the organizationId param to be a string
      bidRequest.params.organizationId = bidRequest.params.organizationId.toString();

      // Force the Data Layer key and value to be a String
      if (bidRequest.params.dataLayer) {
        if (isStr(bidRequest.params.dataLayer) || isNumber(bidRequest.params.dataLayer) || isArray(bidRequest.params.dataLayer) || isFn(bidRequest.params.dataLayer)) {
          logWarn(LOG_PREFIX, 'The dataLayer param is invalid, only object is accepted as a type.');
          delete bidRequest.params.dataLayer;
        } else {
          let invalidDlParam = false;

          bidRequest.params.dl = bidRequest.params.dataLayer
          // Remove the dataLayer from the BidRequest to send the `dl` instead of the `dataLayer`
          delete bidRequest.params.dataLayer

          Object.keys(bidRequest.params.dl).forEach((key) => {
            if (bidRequest.params.dl[key]) {
              if (isStr(bidRequest.params.dl[key]) || isNumber(bidRequest.params.dl[key])) {
                bidRequest.params.dl[key] = bidRequest.params.dl[key].toString();
              } else {
                invalidDlParam = true;
                delete bidRequest.params.dl[key];
              }
            }
          });

          if (invalidDlParam) {
            logWarn(LOG_PREFIX, 'Some parameters of the dataLayer property have been removed because the type is invalid, accepted type: number or string.');
          }
        }
      }

      const features = _getFeatures(bidRequest);
      bidRequest.features = features;

      if (!hasRtd) {
        internal.enqueue({
          action: 'features',
          ts: Date.now(),
          data: {
            features,
            params: { ...bidRequest.params },
            adUnitCode: bidRequest.adUnitCode
          }
        });
      }

      // Handle priceFloors module
      // We need to use `rawBidRequest` as param because:
      // - adagioBidAdapter generates its own auctionId due to transmitTid activity limitation (see https://github.com/prebid/Prebid.js/pull/10079)
      // - the priceFloors.getFloor() uses a `_floorDataForAuction` map to store the floors based on the auctionId.
      const computedFloors = _getFloors(rawBidRequest);
      if (isArray(computedFloors) && computedFloors.length) {
        bidRequest.floors = computedFloors

        if (deepAccess(bidRequest, 'mediaTypes.banner')) {
          const bannerObj = bidRequest.mediaTypes.banner

          const computeNewSizeArray = (sizeArr = []) => {
            const size = { size: sizeArr, floor: null }
            const bannerFloors = bidRequest.floors.filter(floor => floor.mt === BANNER)
            const BannerSizeFloor = bannerFloors.find(floor => floor.s === sizeArr.join('x'))
            size.floor = (bannerFloors) ? (BannerSizeFloor) ? BannerSizeFloor.f : bannerFloors[0].f : null
            return size
          }

          // `bannerSizes`, internal property name
          bidRequest.mediaTypes.banner.bannerSizes = (isArray(bannerObj.sizes[0]))
            ? bannerObj.sizes.map(sizeArr => {
              return computeNewSizeArray(sizeArr)
            })
            : computeNewSizeArray(bannerObj.sizes)
        }

        if (deepAccess(bidRequest, 'mediaTypes.video')) {
          const videoObj = bidRequest.mediaTypes.video
          const videoFloors = bidRequest.floors.filter(floor => floor.mt === VIDEO);
          const playerSize = (videoObj.playerSize && isArray(videoObj.playerSize[0])) ? videoObj.playerSize[0] : videoObj.playerSize
          const videoSizeFloor = (playerSize) ? videoFloors.find(floor => floor.s === playerSize.join('x')) : undefined

          bidRequest.mediaTypes.video.floor = (videoFloors) ? videoSizeFloor ? videoSizeFloor.f : videoFloors[0].f : null
        }

        if (deepAccess(bidRequest, 'mediaTypes.native')) {
          const nativeFloors = bidRequest.floors.filter(floor => floor.mt === NATIVE);
          if (nativeFloors.length) {
            bidRequest.mediaTypes.native.floor = nativeFloors[0].f
          }
        }
      }

      if (deepAccess(bidRequest, 'mediaTypes.video')) {
        _buildVideoBidRequest(bidRequest);
      }

      const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid') || deepAccess(bidRequest, 'ortb2Imp.ext.data.pbadslot');
      if (gpid) {
        bidRequest.gpid = gpid;
      }

      if (!hasRtd) {
        // store the whole bidRequest (adUnit) object in the ADAGIO namespace.
        storeRequestInAdagioNS(bidRequest);
      }

      // Remove some params that are not needed on the server side.
      delete bidRequest.params.siteId;

      // whitelist the fields that are allowed to be sent to the server.
      const adUnit = {
        adUnitCode: bidRequest.adUnitCode,
        auctionId: bidRequest.auctionId,
        bidder: bidRequest.bidder,
        bidId: bidRequest.bidId,
        params: bidRequest.params,
        features: bidRequest.features,
        gpid: bidRequest.gpid,
        mediaTypes: bidRequest.mediaTypes,
        nativeParams: bidRequest.nativeParams,
        score: bidRequest.score,
        transactionId: bidRequest.transactionId,
      }

      return adUnit;
    });

    // Group ad units by organizationId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
      const organizationId = adUnit.params.organizationId

      groupedAdUnits[organizationId] = groupedAdUnits[organizationId] || [];
      groupedAdUnits[organizationId].push(adUnit);

      return groupedAdUnits;
    }, {});

    // Adding more params on the original bid object.
    // Those params are not sent to the server.
    // They are used for further operations on analytics adapter.
    validBidRequests.forEach(rawBidRequest => {
      rawBidRequest.params.adagioAuctionId = aucId
      rawBidRequest.params.pageviewId = pageviewId
    });

    // Build one request per organizationId
    const requests = Object.keys(groupedAdUnits).map(organizationId => {
      return {
        method: 'POST',
        url: ENDPOINT,
        data: {
          organizationId: organizationId,
          hasRtd: hasRtd ? 1 : 0,
          secure: secure,
          device: device,
          site: site,
          pageviewId: pageviewId,
          adUnits: groupedAdUnits[organizationId],
          data: dataExchange,
          regs: {
            gdpr: gdprConsent,
            coppa: coppa,
            ccpa: uspConsent,
            gpp: gppConsent.gpp,
            gppSid: gppConsent.gppSid,
            dsa: dsa // populated if exists
          },
          schain: schain,
          user: {
            eids: eids
          },
          prebidVersion: '$prebid.version$',
          featuresVersion: FEATURES_VERSION,
          usIfr: usIfr,
          adgjs: storage.localStorageIsEnabled()
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
              // bidObj.meta is the `bidResponse.meta` object according to https://docs.prebid.org/dev-docs/bidder-adaptor.html#interpreting-the-response
              bidObj.meta = deepAccess(bidObj, 'meta', {});
              bidObj.meta.mediaType = bidObj.mediaType;
              bidObj.meta.advertiserDomains = (Array.isArray(bidObj.aDomain) && bidObj.aDomain.length) ? bidObj.aDomain : [];

              if (bidObj.mediaType === VIDEO) {
                const mediaTypeContext = deepAccess(bidReq, 'mediaTypes.video.context');
                // Adagio SSP returns a `vastXml` only. No `vastUrl` nor `videoCacheKey`.
                if (!bidObj.vastUrl && bidObj.vastXml) {
                  bidObj.vastUrl = 'data:text/xml;charset=utf-8;base64,' + window.btoa(bidObj.vastXml.replace(/\\"/g, '"'));
                }

                if (mediaTypeContext === OUTSTREAM) {
                  bidObj.outstreamRendererCode = deepAccess(bidReq, 'params.rendererCode', BB_RENDERER_DEFAULT)

                  if (deepAccess(bidReq, 'mediaTypes.video.skip')) {
                    const skipOffset = deepAccess(bidReq, 'mediaTypes.video.skipafter', 5) // default 5s.
                    bidObj.skipOffset = skipOffset
                  }

                  bidObj.renderer = OUTSTREAM_RENDERER.newRenderer(bidObj.adUnitCode, bidObj.outstreamRendererCode);
                }
              }

              if (bidObj.mediaType === NATIVE) {
                _parseNativeBidResponse(bidObj);
              }

              bidObj.site = bidReq.params.site;
              bidObj.placement = bidReq.params.placement;
              bidObj.pagetype = bidReq.params.pagetype;
              bidObj.category = bidReq.params.category;
            }
            bidResponses.push(bidObj);
          });
        }
      }
    } catch (err) {
      logError(err);
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
