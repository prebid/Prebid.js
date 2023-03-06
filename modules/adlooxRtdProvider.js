/**
 * This module adds the Adloox provider to the real time data module
 * This module adds the [Adloox]{@link https://www.adloox.com/} provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch segments from Adloox's server
 * @module modules/adlooxRtdProvider
 * @requires module:modules/realTimeData
 * @requires module:modules/adlooxAnalyticsAdapter
 */

/* eslint standard/no-callback-literal: "off" */
/* eslint prebid/validate-imports: "off" */

import {command as analyticsCommand, COMMAND} from './adlooxAnalyticsAdapter.js';
import {config as _config} from '../src/config.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {
  _each,
  deepAccess,
  deepSetValue,
  getAdUnitSizes,
  getGptSlotInfoForAdUnitCode,
  isArray,
  isBoolean,
  isInteger,
  isPlainObject,
  isStr,
  logError,
  logInfo,
  logWarn,
  mergeDeep
} from '../src/utils.js';
import {includes} from '../src/polyfill.js';

const MODULE_NAME = 'adloox';
const MODULE = `${MODULE_NAME}RtdProvider`;

const API_ORIGIN = 'https://p.adlooxtracking.com';
const SEGMENT_HISTORIC = { 'a': 'aud', 'd': 'dis', 'v': 'vid' };
const SEGMENT_HISTORIC_VALUES = Object.keys(SEGMENT_HISTORIC).map(k => SEGMENT_HISTORIC[k]);

const ADSERVER_TARGETING_PREFIX = 'adl_';

const CREATIVE_WIDTH_MIN = 20;
const CREATIVE_HEIGHT_MIN = 20;
const CREATIVE_AREA_MIN = CREATIVE_WIDTH_MIN * CREATIVE_HEIGHT_MIN;
// try to avoid using IntersectionObserver as it has unbounded (observed multi-second) latency
let intersectionObserver = window == top ? false : undefined;
const intersectionObserverElements = [];
// .map/.findIndex are safe here as they are only used for intersectionObserver
function atf(adUnit, cb) {
  analyticsCommand(COMMAND.TOSELECTOR, { bid: { adUnitCode: adUnit.code } }, function(selector) {
    const element = document.querySelector(selector);
    if (!element) return cb(null);

    if (window.getComputedStyle(element)['display'] == 'none') return cb(NaN);

    try {
      // short circuit for cross-origin
      if (intersectionObserver) throw false;

      // Google's advice is to collapse slots on no fill but
      // we have to cater to clients that grow slots on fill
      const rect = (function(rect) {
        const sizes = getAdUnitSizes(adUnit);

        if (sizes.length == 0) return false;
        // interstitial (0x0, 1x1)
        if (sizes.length == 1 && (sizes[0][0] * sizes[0][1]) <= 1) return true;
        // try to catch premium slots (coord=0,0) as they will likely bounce into view
        if (rect.top <= -window.pageYOffset && rect.left <= -window.pageXOffset && rect.top == rect.bottom) return true;

        // pick the smallest creative size as many publishers will just leave the element unbounded in the vertical
        let width = Infinity;
        let height = Infinity;
        for (let i = 0; i < sizes.length; i++) {
          const area = sizes[i][0] * sizes[i][1];
          if (area < CREATIVE_AREA_MIN) continue;
          if (area < (width * height)) {
            width = sizes[i][0];
            height = sizes[i][1];
          }
        }
        // we also scale the smallest size to the size of the slot as publishers resize units depending on viewport
        const scale = Math.min(1, (rect.right - rect.left) / width);

        return {
          left: rect.left,
          right: rect.left + Math.max(CREATIVE_WIDTH_MIN, scale * width),
          top: rect.top,
          bottom: rect.top + Math.max(CREATIVE_HEIGHT_MIN, scale * height)
        };
      })(element.getBoundingClientRect());

      if (rect === false) return cb(NaN);
      if (rect === true) return cb(1);

      const W = rect.right - rect.left;
      const H = rect.bottom - rect.top;

      if (W * H < CREATIVE_AREA_MIN) return cb(NaN);

      let el;
      let win = window;
      while (1) {
        // https://stackoverflow.com/a/8876069
        const vw = Math.max(win.document.documentElement.clientWidth || 0, win.innerWidth || 0);
        const vh = Math.max(win.document.documentElement.clientHeight || 0, win.innerHeight || 0);

        // cut to viewport
        rect.left = Math.min(Math.max(rect.left, 0), vw);
        rect.right = Math.min(Math.max(rect.right, 0), vw);
        rect.top = Math.min(Math.max(rect.top, 0), vh);
        rect.bottom = Math.min(Math.max(rect.bottom, 0), vh);

        if (win == top) return cb(((rect.right - rect.left) * (rect.bottom - rect.top)) / (W * H));
        el = win.frameElement;
        if (!el) throw false; // cross-origin
        win = win.parent;

        // transpose to frame element
        const frameElementRect = el.getBoundingClientRect();
        rect.left += frameElementRect.left;
        rect.right = Math.min(rect.right + frameElementRect.left, frameElementRect.right);
        rect.top += frameElementRect.top;
        rect.bottom = Math.min(rect.bottom + frameElementRect.top, frameElementRect.bottom);
      }
    } catch (_) {
      if (intersectionObserver === undefined) {
        try {
          intersectionObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
              const ratio = entry.intersectionRect.width * entry.intersectionRect.height < CREATIVE_AREA_MIN ? NaN : entry.intersectionRatio;
              const idx = intersectionObserverElements.findIndex(x => x.element == entry.target);
              intersectionObserverElements[idx].cb.forEach(cb => cb(ratio));
              intersectionObserverElements.splice(idx, 1);
              intersectionObserver.unobserve(entry.target);
            });
          });
        } catch (_) {
          intersectionObserver = false;
        }
      }
      if (!intersectionObserver) return cb(null);
      const idx = intersectionObserverElements.findIndex(x => x.element == element);
      if (idx == -1) {
        intersectionObserverElements.push({ element, cb: [ cb ] });
        intersectionObserver.observe(element);
      } else {
        intersectionObserverElements[idx].cb.push(cb);
      }
    }
  });
}

function init(config, userConsent) {
  logInfo(MODULE, 'init', config, userConsent);

  if (!isPlainObject(config)) {
    logError(MODULE, 'missing config');
    return false;
  }
  if (config.params === undefined) config.params = {};
  if (!(isPlainObject(config.params))) {
    logError(MODULE, 'invalid params');
    return false;
  }
  if (!(config.params.api_origin === undefined || isStr(config.params.api_origin))) {
    logError(MODULE, 'invalid api_origin params value');
    return false;
  }
  if (!(config.params.imps === undefined || (isInteger(config.params.imps) && config.params.imps > 0))) {
    logError(MODULE, 'invalid imps params value');
    return false;
  }
  if (!(config.params.freqcap_ip === undefined || (isInteger(config.params.freqcap_ip) && config.params.freqcap_ip >= 0))) {
    logError(MODULE, 'invalid freqcap_ip params value');
    return false;
  }
  if (!(config.params.freqcap_ipua === undefined || (isInteger(config.params.freqcap_ipua) && config.params.freqcap_ipua >= 0))) {
    logError(MODULE, 'invalid freqcap_ipua params value');
    return false;
  }
  if (!(config.params.thresholds === undefined || (isArray(config.params.thresholds) && config.params.thresholds.every(x => isInteger(x) && x > 0 && x <= 100)))) {
    logError(MODULE, 'invalid thresholds params value');
    return false;
  }
  if (!(config.params.slotinpath === undefined || isBoolean(config.params.slotinpath))) {
    logError(MODULE, 'invalid slotinpath params value');
    return false;
  }
  // legacy/deprecated configuration code path
  if (!(config.params.params === undefined || (isPlainObject(config.params.params) && isInteger(config.params.params.clientid) && isInteger(config.params.params.tagid) && isInteger(config.params.params.platformid)))) {
    logError(MODULE, 'invalid subsection params block');
    return false;
  }

  config.params.thresholds = config.params.thresholds || [ 50, 60, 70, 80, 90 ];

  function analyticsConfigCallback(data) {
    config = mergeDeep(config.params, data);
  }
  if (config.params.params) {
    logWarn(MODULE, `legacy/deprecated configuration (please migrate to ${MODULE_NAME}AnalyticsAdapter)`);
    analyticsConfigCallback(config.params.params);
  } else {
    analyticsCommand(COMMAND.CONFIG, null, analyticsConfigCallback);
  }

  return true;
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  // gptPreAuction runs *after* RTD so pbadslot may not be populated... (╯°□°)╯ ┻━┻
  const adUnits = (reqBidsConfigObj.adUnits || getGlobal().adUnits).map(adUnit => {
    return {
      gpid: deepAccess(adUnit, 'ortb2Imp.ext.gpid') || deepAccess(adUnit, 'ortb2Imp.ext.data.pbadslot') || getGptSlotInfoForAdUnitCode(adUnit.code).gptSlot || adUnit.code,
      unit: adUnit
    };
  }).filter(adUnit => !!adUnit.gpid);

  let response = {};
  function setSegments() {
    function val(v, k) {
      if (!((SEGMENT_HISTORIC[k] || k == 'atf') && v >= 0)) return v;
      return config.params.thresholds.filter(t => t <= v);
    }

    const ortb2 = _config.getConfig('ortb2') || {};
    const dataSite = _config.getConfig('ortb2.site.ext.data') || {};
    const dataUser = _config.getConfig('ortb2.user.ext.data') || {};

    _each(response, (v0, k0) => {
      if (k0 == '_') return;
      const k = SEGMENT_HISTORIC[k0] || k0;
      const v = val(v0, k0);
      deepSetValue(k == k0 ? dataUser : dataSite, `${MODULE_NAME}_rtd.${k}`, v);
    });
    deepSetValue(dataSite, `${MODULE_NAME}_rtd.ok`, true);

    deepSetValue(ortb2, 'site.ext.data', dataSite);
    deepSetValue(ortb2, 'user.ext.data', dataUser);
    _config.setConfig({ ortb2 });

    adUnits.forEach((adUnit, i) => {
      _each(response['_'][i], (v0, k0) => {
        const k = SEGMENT_HISTORIC[k0] || k0;
        const v = val(v0, k0);
        deepSetValue(adUnit.unit, `ortb2Imp.ext.data.${MODULE_NAME}_rtd.${k}`, v);
      });
    });
  };

  // mergeDeep does not handle merging deep arrays... (╯°□°)╯ ┻━┻
  function mergeDeep(target, ...sources) {
    function emptyValue(v) {
      if (isPlainObject(v)) {
        return {};
      } else if (isArray(v)) {
        return [];
      } else {
        return undefined;
      }
    }

    if (!sources.length) return target;
    const source = sources.shift();

    if (isPlainObject(target) && isPlainObject(source)) {
      Object.keys(source).forEach(key => {
        if (!(key in target)) target[key] = emptyValue(source[key]);
        target[key] = target[key] !== undefined ? mergeDeep(target[key], source[key]) : source[key];
      });
    } else if (isArray(target) && isArray(source)) {
      source.forEach((v, i) => {
        if (!(i in target)) target[i] = emptyValue(v);
        target[i] = target[i] !== undefined ? mergeDeep(target[i], v) : v;
      });
    } else {
      target = source;
    }

    return mergeDeep(target, ...sources);
  }

  let semaphore = 1;
  function semaphoreInc(inc) {
    if (semaphore == 0) return;
    semaphore += inc;
    if (semaphore == 0) {
      setSegments()
      callback();
    }
  }

  const refererInfo = getRefererInfo();
  const args = [
    [ 'v', `pbjs-${getGlobal().version}` ],
    [ 'c', config.params.clientid ],
    [ 'p', config.params.platformid ],
    [ 't', config.params.tagid ],
    [ 'imp', config.params.imps ],
    [ 'fc_ip', config.params.freqcap_ip ],
    [ 'fc_ipua', config.params.freqcap_ipua ],
    [ 'pn', (refererInfo.canonicalUrl || refererInfo.referer || '').substr(0, 300).split(/[?#]/)[0] ]
  ];

  if (!adUnits.length) {
    logWarn(MODULE, 'no suitable adUnits (missing pbadslot?)');
  }
  const atfQueue = [];
  adUnits.map((adUnit, i) => {
    const ref = [ adUnit.gpid ];
    if (!config.params.slotinpath) ref.push(adUnit.unit.code);
    args.push(['s', ref.join('\t')]);

    semaphoreInc(1);
    atfQueue.push(function() {
      atf(adUnit.unit, function(x) {
        let viewable = document.visibilityState === undefined || document.visibilityState == 'visible';
        try { viewable = viewable && top.document.hasFocus() } catch (_) {}
        logInfo(MODULE, `atf code=${adUnit.unit.code} has area=${x}, viewable=${viewable}`);
        const atfList = []; atfList[i] = { atf: parseInt(x * 100) };
        response = mergeDeep(response, { _: atfList });
        semaphoreInc(-1);
      });
    });
  });
  function atfCb() {
    atfQueue.forEach(x => x());
  }
  if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', atfCb, false);
  } else {
    atfCb();
  }

  analyticsCommand(COMMAND.URL, {
    url: (config.params.api_origin || API_ORIGIN) + '/q?',
    args: args
  }, function(url) {
    ajax(url, {
      success: function(responseText, q) {
        try {
          if (q.getResponseHeader('content-type') == 'application/json') {
            response = mergeDeep(response, JSON.parse(responseText));
          } else {
            throw false;
          }
        } catch (_) {
          logError(MODULE, 'unexpected response');
        }
        semaphoreInc(-1);
      },
      error: function(statusText, q) {
        logError(MODULE, 'request failed');
        semaphoreInc(-1);
      }
    });
  });
}

function getTargetingData(adUnitArray, config, userConsent) {
  function targetingNormalise(v) {
    if (isArray(v) && v.length == 0) return undefined;
    if (isBoolean(v)) v = ~~v;
    if (!v) return undefined; // empty string and zero
    return v;
  }

  const dataSite = _config.getConfig(`ortb2.site.ext.data.${MODULE_NAME}_rtd`) || {};
  if (!dataSite.ok) return {};

  const dataUser = _config.getConfig(`ortb2.user.ext.data.${MODULE_NAME}_rtd`) || {};
  return getGlobal().adUnits.filter(adUnit => includes(adUnitArray, adUnit.code)).reduce((a, adUnit) => {
    a[adUnit.code] = {};

    _each(dataSite, (v0, k) => {
      if (includes(SEGMENT_HISTORIC_VALUES, k)) return; // ignore site average viewability
      const v = targetingNormalise(v0);
      if (v) a[adUnit.code][ADSERVER_TARGETING_PREFIX + k] = v;
    });

    const adUnitSegments = deepAccess(adUnit, `ortb2Imp.ext.data.${MODULE_NAME}_rtd`, {});
    _each(Object.assign({}, dataUser, adUnitSegments), (v0, k) => {
      const v = targetingNormalise(v0);
      if (v) a[adUnit.code][ADSERVER_TARGETING_PREFIX + k] = v;
    });

    return a;
  }, {});
}

export const subModuleObj = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
  getTargetingData,
  atf // used by adlooxRtdProvider_spec.js
};

submodule('realTimeData', subModuleObj);
