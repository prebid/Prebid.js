"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.enrichFPD = exports.dep = void 0;
var _hook = require("../hook.js");
var _refererDetection = require("../refererDetection.js");
var _rootDomain = require("./rootDomain.js");
var _utils = require("../utils.js");
var _config = require("../config.js");
var _sua = require("./sua.js");
var _promise = require("../utils/promise.js");
var _oneClient = require("./oneClient.js");
var _rules = require("../activities/rules.js");
var _activityParams = require("../activities/activityParams.js");
var _activities = require("../activities/activities.js");
var _modules = require("../activities/modules.js");
const dep = exports.dep = {
  getRefererInfo: _refererDetection.getRefererInfo,
  findRootDomain: _rootDomain.findRootDomain,
  getWindowTop: _utils.getWindowTop,
  getWindowSelf: _utils.getWindowSelf,
  getHighEntropySUA: _sua.getHighEntropySUA,
  getLowEntropySUA: _sua.getLowEntropySUA
};
const oneClient = (0, _oneClient.clientSectionChecker)('FPD');

/**
 * Enrich an ortb2 object with first party data.
 * @param {Promise[{}]} fpd: a promise to an ortb2 object.
 * @returns: {Promise[{}]}: a promise to an enriched ortb2 object.
 */
const enrichFPD = exports.enrichFPD = (0, _hook.hook)('sync', fpd => {
  const promArr = [fpd, getSUA().catch(() => null), tryToGetCdepLabel().catch(() => null)];
  return _promise.GreedyPromise.all(promArr).then(_ref => {
    let [ortb2, sua, cdep] = _ref;
    const ri = dep.getRefererInfo();
    mergeLegacySetConfigs(ortb2);
    Object.entries(ENRICHMENTS).forEach(_ref2 => {
      let [section, getEnrichments] = _ref2;
      const data = getEnrichments(ortb2, ri);
      if (data && Object.keys(data).length > 0) {
        ortb2[section] = (0, _utils.mergeDeep)({}, data, ortb2[section]);
      }
    });
    if (sua) {
      (0, _utils.deepSetValue)(ortb2, 'device.sua', Object.assign({}, sua, ortb2.device.sua));
    }
    if (cdep) {
      const ext = {
        cdep
      };
      (0, _utils.deepSetValue)(ortb2, 'device.ext', Object.assign({}, ext, ortb2.device.ext));
    }
    ortb2 = oneClient(ortb2);
    for (let section of _oneClient.CLIENT_SECTIONS) {
      if ((0, _oneClient.hasSection)(ortb2, section)) {
        ortb2[section] = (0, _utils.mergeDeep)({}, clientEnrichment(ortb2, ri), ortb2[section]);
        break;
      }
    }
    return ortb2;
  });
});
function mergeLegacySetConfigs(ortb2) {
  // merge in values from "legacy" setConfig({app, site, device})
  // TODO: deprecate these eventually
  ['app', 'site', 'device'].forEach(prop => {
    const cfg = _config.config.getConfig(prop);
    if (cfg != null) {
      ortb2[prop] = (0, _utils.mergeDeep)({}, cfg, ortb2[prop]);
    }
  });
}
function winFallback(fn) {
  try {
    return fn(dep.getWindowTop());
  } catch (e) {
    return fn(dep.getWindowSelf());
  }
}
function getSUA() {
  const hints = _config.config.getConfig('firstPartyData.uaHints');
  return !Array.isArray(hints) || hints.length === 0 ? _promise.GreedyPromise.resolve(dep.getLowEntropySUA()) : dep.getHighEntropySUA(hints);
}
function removeUndef(obj) {
  return (0, _utils.getDefinedParams)(obj, Object.keys(obj));
}
function tryToGetCdepLabel() {
  return _promise.GreedyPromise.resolve('cookieDeprecationLabel' in navigator && (0, _rules.isActivityAllowed)(_activities.ACTIVITY_ACCESS_DEVICE, (0, _activityParams.activityParams)(_modules.MODULE_TYPE_PREBID, 'cdep')) && navigator.cookieDeprecationLabel.getValue());
}
const ENRICHMENTS = {
  site(ortb2, ri) {
    if (_oneClient.CLIENT_SECTIONS.filter(p => p !== 'site').some(_oneClient.hasSection.bind(null, ortb2))) {
      // do not enrich site if dooh or app are set
      return;
    }
    return removeUndef({
      page: ri.page,
      ref: ri.ref
    });
  },
  device() {
    return winFallback(win => {
      const w = win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth;
      const h = win.innerHeight || win.document.documentElement.clientHeight || win.document.body.clientHeight;
      return {
        w,
        h,
        dnt: (0, _utils.getDNT)() ? 1 : 0,
        ua: win.navigator.userAgent,
        language: win.navigator.language.split('-').shift()
      };
    });
  },
  regs() {
    const regs = {};
    if (winFallback(win => win.navigator.globalPrivacyControl)) {
      (0, _utils.deepSetValue)(regs, 'ext.gpc', 1);
    }
    const coppa = _config.config.getConfig('coppa');
    if (typeof coppa === 'boolean') {
      regs.coppa = coppa ? 1 : 0;
    }
    return regs;
  }
};

// Enrichment of properties common across dooh, app and site - will be dropped into whatever
// section is appropriate
function clientEnrichment(ortb2, ri) {
  var _winFallback, _winFallback$replace;
  const domain = (0, _refererDetection.parseDomain)(ri.page, {
    noLeadingWww: true
  });
  const keywords = (_winFallback = winFallback(win => win.document.querySelector('meta[name=\'keywords\']'))) === null || _winFallback === void 0 || (_winFallback = _winFallback.content) === null || _winFallback === void 0 || (_winFallback$replace = _winFallback.replace) === null || _winFallback$replace === void 0 ? void 0 : _winFallback$replace.call(_winFallback, /\s/g, '');
  return removeUndef({
    domain,
    keywords,
    publisher: removeUndef({
      domain: dep.findRootDomain(domain)
    })
  });
}