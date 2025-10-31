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
  getWinDimensions,
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
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';

import {getGlobalVarName} from '../src/buildOptions.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('../modules/rtdModule/index.js').adUnit} adUnit
 */
const SUBMODULE_NAME = 'adagio';
const ADAGIO_BIDDER_CODE = 'adagio';
const GVLID = 617;
const SCRIPT_URL = 'https://script.4dex.io/a/latest/adagio.js';
const LATEST_ABTEST_VERSION = 2;
export const PLACEMENT_SOURCES = {
  ORTB: 'ortb', // implicit default, not used atm.
  ADUNITCODE: 'code',
  GPID: 'gpid'
};
export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });

const { logError, logInfo, logWarn } = prefixLog('AdagioRtdProvider:');

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
      const isNewSession = (expiry) => {
        return (!isNumber(expiry) || Date.now() > expiry);
      };

      storage.getDataFromLocalStorage('adagio', (storageValue) => {
        // session can be an empty object
        const { rnd, vwSmplg, vwSmplgNxt, expiry, lastActivityTime, id, pages, testName: legacyTestName, testVersion: legacyTestVersion } = _internal.getSessionFromLocalStorage(storageValue);

        const isNewSess = isNewSession(expiry);

        const abTest = _internal.getAbTestFromLocalStorage(storageValue);

        // if abTest is defined it means that the website is using the new version of the snippet
        const v = abTest ? LATEST_ABTEST_VERSION : undefined;

        data.session = {
          rnd,
          pages: pages || 1,
          new: isNewSess, // legacy: `new` was used but the choosen name is not good.
          // Don't use values if they are not defined.
          ...(v !== undefined && { v }),
          ...(vwSmplg !== undefined && { vwSmplg }),
          ...(vwSmplgNxt !== undefined && { vwSmplgNxt }),
          ...(expiry !== undefined && { expiry }),
          ...(lastActivityTime !== undefined && { lastActivityTime }), // legacy: used by older version of the snippet
          ...(id !== undefined && { id }),
        };

        if (isNewSess) {
          data.session.new = true;
          data.session.id = generateUUID();
          data.session.rnd = Math.random();
        }

        if (v === LATEST_ABTEST_VERSION) {
          const { testName, testVersion, expiry: abTestExpiry, sessionId } = abTest;
          if (abTestExpiry && abTestExpiry > Date.now() && (!sessionId || sessionId === data.session.id)) { // if AbTest didn't set a session id, it's probably because it's a new one and it didn't retrieve it yet, assume it's okay to get test Name and Version.
            if (testName && testVersion) {
              data.session.testName = testName;
              data.session.testVersion = testVersion;
            }
          }
        } else {
          if (legacyTestName && legacyTestVersion) {
            data.session.testName = legacyTestName;
            data.session.testVersion = legacyTestVersion;
          }
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

    const obj = this.getObjFromStorageValue(storageValue);

    return (!obj || !obj.session) ? _default : obj.session;
  },

  /**
   * Returns the abTest data from the localStorage.
   *
   * @param {string} storageValue - The value stored in the localStorage.
   * @returns {AbTest}
   */
  getAbTestFromLocalStorage: function(storageValue) {
    const obj = this.getObjFromStorageValue(storageValue);

    return (!obj || !obj.abTest) ? null : obj.abTest;
  },

  /**
   * Returns the parsed data from the localStorage.
   *
   * @param {string} storageValue - The value stored in the localStorage.
   * @returns {Object}
   */
  getObjFromStorageValue: function(storageValue) {
    return JSON.parse(storageValue, function(name, value) {
      if (name.charAt(0) !== '_' || name === '') {
        return value;
      }
    });
  },

  // Compute the placement from the legacy RTD config params or ortb2Imp.ext.data.placement key.
  computePlacementFromLegacy: function(rtdConfig, adUnit) {
    const placementSource = deepAccess(rtdConfig, 'params.placementSource', '');
    let placementFromSource = '';

    switch (placementSource.toLowerCase()) {
      case PLACEMENT_SOURCES.ADUNITCODE:
        placementFromSource = adUnit.code;
        break;
      case PLACEMENT_SOURCES.GPID:
        placementFromSource = deepAccess(adUnit, 'ortb2Imp.ext.gpid')
        break;
    }

    const placementLegacy = deepAccess(adUnit, 'ortb2Imp.ext.data.placement', '');

    return placementFromSource || placementLegacy;
  }
};

function loadAdagioScript(config) {
  storage.localStorageIsEnabled(isValid => {
    if (!isValid) {
      return;
    }

    loadExternalScript(SCRIPT_URL, MODULE_TYPE_RTD, SUBMODULE_NAME, undefined, undefined, {
      id: `adagiojs-${getUniqueIdentifierStr()}`,
      'data-pid': config.params.organizationId
    });
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

    const adagioBid = adUnit.bids.find(bid => _internal.isAdagioBidder(bid.bidder));
    if (adagioBid) {
      // ortb2 level
      // We expect that `pagetype`, `category` are defined in FPD `ortb2.site.ext.data` object.
      // Btw, we still ensure compatibility with publishers that use the adagio params at the adUnit.params level.
      let mustWarnOrtb2 = false;
      if (!deepAccess(ortb2Site, 'ext.data.pagetype') && adagioBid.params.pagetype) {
        deepSetValue(ortb2Site, 'ext.data.pagetype', adagioBid.params.pagetype);
        mustWarnOrtb2 = true;
      }
      if (!deepAccess(ortb2Site, 'ext.data.category') && adagioBid.params.category) {
        deepSetValue(ortb2Site, 'ext.data.category', adagioBid.params.category);
        mustWarnOrtb2 = true;
      }
      if (mustWarnOrtb2) {
        logInfo('`pagetype` and/or `category` have been set in the FPD `ortb2.site.ext.data` object from `adUnits[].bids.adagio.params`.');
      }

      // ortb2Imp level to handle legacy.
      // The `placement` is finally set at the adUnit.params level (see https://github.com/prebid/Prebid.js/issues/12845)
      // but we still need to set it at the ortb2Imp level for our internal use.
      const placementParam = adagioBid.params.placement;
      const adgRtdPlacement = deepAccess(ortb2Imp, 'ext.data.adg_rtd.placement', '');

      if (placementParam) {
        // Always overwrite the ortb2Imp value with the one from the adagio adUnit.params.placement if defined.
        // This is the common case.
        deepSetValue(ortb2Imp, 'ext.data.adg_rtd.placement', placementParam);
      }

      if (!placementParam && !adgRtdPlacement) {
        const p = _internal.computePlacementFromLegacy(config, adUnit);
        if (p) {
          deepSetValue(ortb2Imp, 'ext.data.adg_rtd.placement', p);
          logWarn('`ortb2Imp.ext.data.adg_rtd.placement` has been set from a legacy source. Please set `bids[].adagio.params.placement` or `ortb2Imp.ext.data.adg_rtd.placement` value.');
        }
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
      localPbjs: getGlobalVarName(),
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
      const frameClientRect = getBoundingClientRect(frame);
      const elementClientRect = getBoundingClientRect(element);

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

      const box = getBoundingClientRect(domElement);

      const windowDimensions = getWinDimensions();

      const body = d.body;
      const clientTop = d.clientTop || body.clientTop || 0;
      const clientLeft = d.clientLeft || body.clientLeft || 0;
      const scrollTop = wt.pageYOffset || windowDimensions.document.documentElement.scrollTop || windowDimensions.document.body.scrollTop;
      const scrollLeft = wt.pageXOffset || windowDimensions.document.documentElement.scrollLeft || windowDimensions.document.body.scrollLeft;

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
    const { innerWidth, innerHeight } = getWinDimensions();
    viewportDims.w = innerWidth;
    viewportDims.h = innerHeight;
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
        ws.apntag.onEvent(eventName, function () {
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
 * @property {string} id - uuid of the session.
 * @property {boolean} new - True if the session is new.
 * @property {number} rnd - Random number used to determine if the session is new.
 * @property {number} vwSmplg - View sampling rate.
 * @property {number} vwSmplgNxt - Next view sampling rate.
 * @property {number} expiry - Timestamp after which session should be considered expired.
 * @property {number} lastActivityTime - Last activity time.
 * @property {number} pages - current number of pages seen.
 * @property {string} testName - The test name defined by the publisher. Legacy only present for websites with older abTest snippet.
 * @property {string} testVersion - 'clt', 'srv'. Legacy only present for websites with older abTest snippet.
 */

/**
 * @typedef {Object} AbTest
 * @property {string} testName - The test name defined by the publisher.
 * @property {string} testVersion - 'clt', 'srv'.
 * @property {string} sessionId - uuid of the session.
 * @property {number} expiry - Timestamp after which session should be considered expired.
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
