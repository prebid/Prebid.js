/**
 * This module adds the adagio provider to the Real Time Data module (rtdModule).
 * The {@link module:modules/realTimeData} module is required.
 * @module modules/adagioRtdProvider
 * @requires module:modules/realTimeData
 */
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import adapterManager from '../src/adapterManager.js';
import { loadExternalScript } from '../src/adloader.js';
import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  canAccessWindowTop,
  deepAccess,
  deepSetValue,
  generateUUID,
  getDomLoadingDuration,
  getSafeframeGeometry,
  getUniqueIdentifierStr,
  getWindowSelf,
  getWindowTop,
  inIframe,
  isNumber,
  isSafeFrameWindow,
  isStr,
  prefixLog
} from '../src/utils.js';
import { _ADAGIO, getBestWindowForAdagio } from '../libraries/adagioUtils/adagioUtils.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('../modules/rtdModule/index.js').adUnit} adUnit
 */
const SUBMODULE_NAME = 'adagio';
const ADAGIO_BIDDER_CODE = 'adagio';
const GVLID = 617;
const SCRIPT_URL = 'https://script.4dex.io/a/latest/adagio.js';
const SESS_DURATION = 30 * 60 * 1000;
export const PLACEMENT_SOURCES = {
  ORTB: 'ortb', // implicit default, not used atm.
  ADUNITCODE: 'code',
  GPID: 'gpid'
};
export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });

const { logError, logWarn } = prefixLog('AdagioRtdProvider:');

// Guard to avoid storing the same bid data several times.
const guard = new Set();

/**
 * Store the sampling data.
 * This data is used to determine if beacons should be sent to adagio.
 * The sampling data
 */
const _SESSION = (function() {
  /**
   * @type {SessionData}
   */
  const data = {
    session: {}
  };

  return {
    init: () => {
      // helper function to determine if the session is new.
      const isNewSession = (lastActivity) => {
        const now = Date.now();
        return (!isNumber(lastActivity) || (now - lastActivity) > SESS_DURATION);
      };

      storage.getDataFromLocalStorage('adagio', (storageValue) => {
        // session can be an empty object
        const { rnd, new: isNew = false, vwSmplg, vwSmplgNxt, lastActivityTime, id, testName, testVersion, initiator } = _internal.getSessionFromLocalStorage(storageValue);

        // isNew can be `true` if the session has been initialized by the A/B test snippet (external)
        const isNewSess = (initiator === 'snippet') ? isNew : isNewSession(lastActivityTime);

        data.session = {
          rnd,
          new: isNewSess, // legacy: `new` was used but the choosen name is not good.
          // Don't use values if they are not defined.
          ...(vwSmplg !== undefined && { vwSmplg }),
          ...(vwSmplgNxt !== undefined && { vwSmplgNxt }),
          ...(lastActivityTime !== undefined && { lastActivityTime }),
          ...(id !== undefined && { id }),
          ...(testName !== undefined && { testName }),
          ...(testVersion !== undefined && { testVersion }),
          ...(initiator !== undefined && { initiator }),
        };

        // `initiator` is a pseudo flag used to know if the session has been initialized by the A/B test snippet (external).
        // If the AB Test snippet has not been used, then `initiator` value is `adgjs` or `undefined`.
        // The check on `testName` is used to ensure that the A/B test values are removed.
        if (initiator !== 'snippet' && (isNewSess || testName)) {
          data.session.new = true;
          data.session.id = generateUUID();
          data.session.rnd = Math.random();
          // Ensure that the A/B test values are removed.
          delete data.session.testName;
          delete data.session.testVersion;
        }

        _internal.getAdagioNs().queue.push({
          action: 'session',
          ts: Date.now(),
          data: {
            session: {
              ...data.session
            }
          }
        });
      });
    },
    get: function() {
      return data.session;
    }
  };
})();

const _FEATURES = (function() {
  /**
   * @type {Features}
   */
  const features = {
    initialized: false,
    data: {},
  };

  return {
    // reset is used for testing purpose
    reset: function() {
      features.initialized = false;
      features.data = {};
    },
    get: function() {
      const w = getBestWindowForAdagio();

      if (!features.initialized) {
        features.data = {
          page_dimensions: getPageDimensions().toString(),
          viewport_dimensions: getViewPortDimensions().toString(),
          user_timestamp: getTimestampUTC().toString(),
          dom_loading: getDomLoadingDuration(w).toString(),
        };
        features.initialized = true;
      }

      return { ...features.data };
    }
  };
})();

export const _internal = {
  getAdagioNs: function() {
    return _ADAGIO;
  },

  getSession: function() {
    return _SESSION;
  },

  getFeatures: function() {
    return _FEATURES;
  },

  getGuard: function() {
    return guard;
  },

  /**
   * Ensure that the bidder is Adagio.
   *
   * @param {string} alias
   * @returns {boolean}
   */
  isAdagioBidder: function (alias) {
    if (!alias) {
      return false;
    }
    return (alias + adapterManager.aliasRegistry[alias]).toLowerCase().includes(ADAGIO_BIDDER_CODE);
  },

  /**
   * Returns the session data from the localStorage.
   *
   * @param {string} storageValue - The value stored in the localStorage.
   * @returns {Session}
   */
  getSessionFromLocalStorage: function(storageValue) {
    const _default = {
      new: true,
      rnd: Math.random()
    };

    const obj = JSON.parse(storageValue, function(name, value) {
      if (name.charAt(0) !== '_' || name === '') {
        return value;
      }
    });

    return (!obj || !obj.session) ? _default : obj.session;
  }
};

function loadAdagioScript(config) {
  storage.localStorageIsEnabled(isValid => {
    if (!isValid) {
      return;
    }

    loadExternalScript(SCRIPT_URL, SUBMODULE_NAME, undefined, undefined, { id: `adagiojs-${getUniqueIdentifierStr()}`, 'data-pid': config.params.organizationId });
  });
}

/**
 * Initialize the Adagio RTD Module.
 * @param {Object} config
 * @param {Object} _userConsent
 * @returns {boolean}
 */
function init(config, _userConsent) {
  if (!isStr(config.params?.organizationId) || !isStr(config.params?.site)) {
    logError('organizationId is required and must be a string.');
    return false;
  }

  _internal.getAdagioNs().hasRtd = true;

  _internal.getSession().init();

  registerEventsForAdServers(config);

  loadAdagioScript(config);

  return true;
}

/**
 * onBidRequest is called for each bidder during an auction and contains the bids for that bidder.
 *
 * @param {*} bidderRequest
 * @param {*} config
 * @param {*} _userConsent
 */
function onBidRequest(bidderRequest, config, _userConsent) {
  // setTimeout trick to ensure that the `bidderRequest.params` values updated by a bidder adapter are taken into account.
  // @todo: Check why we have to do it like this, and if there is a better way. Check how the event is dispatched in rtdModule/index.js
  setTimeout(() => {
    bidderRequest.bids.forEach(bid => {
      const uid = deepAccess(bid, 'ortb2.site.ext.data.adg_rtd.uid');
      if (!uid) {
        logError('The `uid` is required to store the request in the ADAGIO namespace.');
        return;
      }

      // No need to store the same info several times.
      // `uid` is unique as it is generated by the RTD module itself for each auction.
      const key = `${bid.adUnitCode}-${uid}`;
      if (_internal.getGuard().has(key)) {
        return;
      }

      _internal.getGuard().add(key);
      storeRequestInAdagioNS(bid, config);
    });
  }, 1);
}

/**
 * onGetBidRequestData is called once per auction.
 * Update both the `ortb2Fragments` and `ortb2Imp` objects with features computed for Adagio.
 *
 * @param {*} bidReqConfig
 * @param {*} callback
 * @param {*} config
 */
function onGetBidRequestData(bidReqConfig, callback, config) {
  const configParams = deepAccess(config, 'params', {});
  const { site: ortb2Site } = bidReqConfig.ortb2Fragments.global;
  const features = _internal.getFeatures().get();
  const ext = {
    uid: generateUUID(),
    pageviewId: _ADAGIO.pageviewId,
    features: { ...features },
    session: { ..._SESSION.get() }
  };

  deepSetValue(ortb2Site, `ext.data.adg_rtd`, ext);

  const adUnits = bidReqConfig.adUnits || getGlobal().adUnits || [];
  adUnits.forEach(adUnit => {
    adUnit.ortb2Imp = adUnit.ortb2Imp || {};
    const ortb2Imp = deepAccess(adUnit, 'ortb2Imp');

    // A divId is required to compute the slot position and later to track viewability.
    // If nothing has been explicitly set, we try to get the divId from the GPT slot and fallback to the adUnit code in last resort.
    let divId = deepAccess(ortb2Imp, 'ext.data.divId')
    if (!divId) {
      divId = getGptSlotInfoForAdUnitCode(adUnit.code).divId;
      deepSetValue(ortb2Imp, `ext.data.divId`, divId || adUnit.code);
    }

    const slotPosition = getSlotPosition(divId);
    deepSetValue(ortb2Imp, `ext.data.adg_rtd.adunit_position`, slotPosition);

    // It is expected that the publisher set a `adUnits[].ortb2Imp.ext.data.placement` value.
    // Btw, We allow fallback sources to programmatically set this value.
    // The source is defined in the `config.params.placementSource` and the possible values are `code` or `gpid`.
    // (Please note that this `placement` is not related to the oRTB video property.)
    if (!deepAccess(ortb2Imp, 'ext.data.placement')) {
      const { placementSource = '' } = configParams;

      switch (placementSource.toLowerCase()) {
        case PLACEMENT_SOURCES.ADUNITCODE:
          deepSetValue(ortb2Imp, 'ext.data.placement', adUnit.code);
          break;
        case PLACEMENT_SOURCES.GPID:
          deepSetValue(ortb2Imp, 'ext.data.placement', deepAccess(ortb2Imp, 'ext.gpid'));
          break;
        default:
          logWarn('`ortb2Imp.ext.data.placement` is missing and `params.definePlacement` is not set in the config.');
      }
    }

    // We expect that `pagetype`, `category`, `placement` are defined in FPD `ortb2.site.ext.data` and `adUnits[].ortb2Imp.ext.data` objects.
    // Btw, we have to ensure compatibility with publishers that use the "legacy" adagio params at the adUnit.params level.
    const adagioBid = adUnit.bids.find(bid => _internal.isAdagioBidder(bid.bidder));
    if (adagioBid) {
      // ortb2 level
      let mustWarnOrtb2 = false;
      if (!deepAccess(ortb2Site, 'ext.data.pagetype') && adagioBid.params.pagetype) {
        deepSetValue(ortb2Site, 'ext.data.pagetype', adagioBid.params.pagetype);
        mustWarnOrtb2 = true;
      }
      if (!deepAccess(ortb2Site, 'ext.data.category') && adagioBid.params.category) {
        deepSetValue(ortb2Site, 'ext.data.category', adagioBid.params.category);
        mustWarnOrtb2 = true;
      }

      // ortb2Imp level
      let mustWarnOrtb2Imp = false;
      if (!deepAccess(ortb2Imp, 'ext.data.placement')) {
        if (adagioBid.params.placement) {
          deepSetValue(ortb2Imp, 'ext.data.placement', adagioBid.params.placement);
          mustWarnOrtb2Imp = true;
        }
      }

      if (mustWarnOrtb2) {
        logWarn('`pagetype` and `category` must be defined in the FPD `ortb2.site.ext.data` object. Relying on `adUnits[].bids.adagio.params` is deprecated.');
      }
      if (mustWarnOrtb2Imp) {
        logWarn('`placement` must be defined in the FPD `adUnits[].ortb2Imp.ext.data` object. Relying on `adUnits[].bids.adagio.params` is deprecated.');
      }
    }
  });

  callback();
}

export const adagioRtdSubmodule = {
  name: SUBMODULE_NAME,
  gvlid: GVLID,
  init: init,
  getBidRequestData: onGetBidRequestData,
  onBidRequestEvent: onBidRequest,
};

submodule('realTimeData', adagioRtdSubmodule);

// ---
//
// internal functions moved from adagioBidAdapter.js to adagioRtdProvider.js.
//
// Several of these functions could be redistribued in Prebid.js core or in a library
//
// ---

/**
 * storeRequestInAdagioNS store ad-units in the ADAGIO namespace for further usage.
 * Not all the properties are stored, only the ones that are useful for adagio.js.
 *
 * @param {*} bid - The bid object. Correspond to the bidRequest.bids[i] object.
 * @param {*} config - The RTD module configuration.
 * @returns {void}
 */
function storeRequestInAdagioNS(bid, config) {
  try {
    const { bidder, adUnitCode, mediaTypes, params, auctionId, bidderRequestsCount, ortb2, ortb2Imp } = bid;

    const { organizationId, site } = config.params;

    const ortb2Data = deepAccess(ortb2, 'site.ext.data', {});
    const ortb2ImpData = deepAccess(ortb2Imp, 'ext.data', {});

    // TODO: `bidderRequestsCount` must be incremented with s2s context, actually works only for `client` context
    // see: https://github.com/prebid/Prebid.js/pull/11295/files#diff-d5c9b255c545e5097d1cd2f49e7dad309b731e34d788f9c28432ad43ebcd7785L114
    const data = {
      bidder,
      adUnitCode,
      mediaTypes,
      params,
      auctionId,
      bidderRequestsCount,
      ortb2: ortb2Data,
      ortb2Imp: ortb2ImpData,
      localPbjs: '$$PREBID_GLOBAL$$',
      localPbjsRef: getGlobal(),
      organizationId,
      site
    };

    _internal.getAdagioNs().queue.push({
      action: 'store',
      ts: Date.now(),
      data
    });
  } catch (e) {
    logError(e);
  }
}

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
    logWarn(err);
    return false;
  }
};

function getSlotPosition(divId) {
  if (!isSafeFrameWindow() && !canAccessWindowTop()) {
    return '';
  }

  const position = { x: 0, y: 0 };

  if (isSafeFrameWindow()) {
    const { self } = getSafeframeGeometry() || {};

    if (!self) {
      return '';
    }

    position.x = Math.round(self.t);
    position.y = Math.round(self.l);
  } else {
    try {
      // window.top based computing
      const wt = getWindowTop();
      const d = wt.document;

      let domElement;

      if (inIframe() === true) {
        const ws = getWindowSelf();
        const currentElement = ws.document.getElementById(divId);
        domElement = getElementFromTopWindow(currentElement, ws);
      } else {
        domElement = wt.document.getElementById(divId);
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
        logWarn('The element is hidden. The slot position cannot be computed.');
      }

      position.x = Math.round(box.left + scrollLeft - clientLeft);
      position.y = Math.round(box.top + scrollTop - clientTop);
    } catch (err) {
      logError(err);
      return '';
    }
  }

  return `${position.x}x${position.y}`;
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

function getViewPortDimensions() {
  if (!isSafeFrameWindow() && !canAccessWindowTop()) {
    return '';
  }

  const viewportDims = { w: 0, h: 0 };

  if (isSafeFrameWindow()) {
    const { win } = getSafeframeGeometry() || {};

    if (!win) {
      return '';
    }

    viewportDims.w = Math.round(win.w);
    viewportDims.h = Math.round(win.h);
  } else {
    // window.top based computing
    const wt = getWindowTop();
    viewportDims.w = wt.innerWidth;
    viewportDims.h = wt.innerHeight;
  }

  return `${viewportDims.w}x${viewportDims.h}`;
}

function getTimestampUTC() {
  // timestamp returned in seconds
  return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
}

/**
 * registerEventsForAdServers bind adagio listeners to ad-server events.
 * Theses events are used to track the viewability and attention.
 *
 * @param {*} config
 * @returns {void}
 */
function registerEventsForAdServers(config) {
  const GPT_EVENTS = new Set([
    'impressionViewable',
    'slotRenderEnded',
    'slotVisibilityChanged',
  ]);

  const SAS_EVENTS = new Set([
    'noad',
    'setHeaderBiddingWinner',
  ]);

  const AST_EVENTS = new Set([
    'adLoaded',
  ]);

  // Listen to ad-server events in current window
  // as we can be safe in a Post-Bid scenario.
  const ws = getWindowSelf();

  // Keep a reference to the window on which the listener is attached.
  // this is used to avoid to bind event several times.
  if (!Array.isArray(_internal.getAdagioNs().windows)) {
    _internal.getAdagioNs().windows = [];
  }

  let selfStoredWindow = _internal.getAdagioNs().windows.find(_w => _w.self === ws);
  if (!selfStoredWindow) {
    selfStoredWindow = { self: ws };
    _internal.getAdagioNs().windows.push(selfStoredWindow);
  }

  const register = (namespace, command, selfWindow, adserver, cb) => {
    try {
      if (selfWindow.adserver === adserver) {
        return;
      }
      ws[namespace] = ws[namespace] || {};
      ws[namespace][command] = ws[namespace][command] || [];
      cb();
    } catch (e) {
      logError(e);
    }
  };

  register('googletag', 'cmd', ws, 'gpt', () => {
    ws.googletag.cmd.push(() => {
      GPT_EVENTS.forEach(eventName => {
        ws.googletag.pubads().addEventListener(eventName, (args) => {
          _internal.getAdagioNs().queue.push({
            action: 'gpt-event',
            data: { eventName, args, _window: ws },
            ts: Date.now(),
          });
        });
      });
      selfStoredWindow.adserver = 'gpt';
    });
  });

  register('sas', 'cmd', ws, 'sas', () => {
    ws.sas.cmd.push(() => {
      SAS_EVENTS.forEach(eventName => {
        ws.sas.events.on(eventName, (args) => {
          _internal.getAdagioNs().queue.push({
            action: 'sas-event',
            data: { eventName, args, _window: ws },
            ts: Date.now(),
          });
        });
      });
      selfStoredWindow.adserver = 'sas';
    });
  });

  // https://learn.microsoft.com/en-us/xandr/seller-tag/on-event
  register('apntag', 'anq', ws, 'ast', () => {
    ws.apntag.anq.push(() => {
      AST_EVENTS.forEach(eventName => {
        ws.apntag.onEvent(eventName, () => {
          _internal.getAdagioNs().queue.push({
            action: 'ast-event',
            data: { eventName, args: arguments, _window: ws },
            ts: Date.now(),
          });
        });
      });
      selfStoredWindow.adserver = 'ast';
    });
  });
};

// --- end of internal functions ----- //

/**
 * @typedef {Object} AdagioWindow
 * @property {Window} self
 * @property {string} adserver - 'gpt', 'sas', 'ast'
 */

/**
 * @typedef {Object} AdagioGlobal
 * @property {Object} adUnits
 * @property {Array} pbjsAdUnits
 * @property {Array} queue
 * @property {Array<AdagioWindow>} windows
 */

/**
 * @typedef {Object} Session
 * @property {boolean} new - True if the session is new.
 * @property {number} rnd - Random number used to determine if the session is new.
 * @property {number} vwSmplg - View sampling rate.
 * @property {number} vwSmplgNxt - Next view sampling rate.
 * @property {number} lastActivityTime - Last activity time.
 */

/**
 * @typedef {Object} SessionData
 * @property {Session} session - the session data.
 */

/**
 * @typedef {Object} Features
 * @property {boolean} initialized - True if the features are initialized.
 * @property {Object} data - the features data.
 */
