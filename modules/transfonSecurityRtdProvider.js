/**
 * This module adds the Transfon Security traffic quality verdict to the auction.
 * @module modules/transfonSecurityRtdProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {import('./transfonSecurityRtdProvider.d.ts').TransfonSecurityRtdProviderParams} TransfonSecurityRtdProviderParams
 */

import { getHook, ready as hooksReady, submodule } from '../src/hook.js';
import { loadExternalScript } from '../src/adloader.js';
import { deepSetValue, generateUUID, logError, logInfo } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import adapterManager from '../src/adapterManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { ACTIVITY_ACCESS_DEVICE, ACTIVITY_ACCESS_REQUEST_CREDENTIALS, ACTIVITY_REPORT_ANALYTICS, ACTIVITY_TRANSMIT_EIDS } from '../src/activities/activities.js';
import { activityParams } from '../src/activities/activityParams.js';
import { isActivityAllowed } from '../src/activities/rules.js';
import { ACTIVITY_PARAM_STORAGE_KEY, ACTIVITY_PARAM_STORAGE_TYPE, ACTIVITY_PARAM_STORAGE_WRITE } from '../src/activities/params.js';
import { allConsent } from '../src/consentHandler.js';

const SUBMODULE_NAME = 'transfonSecurity';
const GVLID = 1370;
const LOG_PREFIX = 'TransfonSecurity RTD:';
const RTD_TAG_URL = 'https://tag.waf360.com/tag/p/rtd.js';
const DEFAULT_TIMEOUT = 1000;
const TARGETING_KEY = 'tss_qs';
const LICENSE_ID = /^[0-9a-f]{10}$/;
const UID_COOKIE = '__unis_uid';
const UID_DAYS = 301;
// RTD runs its providers in a startAuction hook at priority 20
const RTD_DONE_PRIORITY = 19;
const FINAL_PRIORITY = 1;
const SESSION_COOKIE = '_pqs';
const FAILED_ATTRIBUTE = 'data-transfon-security-failed';
const SECURITY_TAG_ID = 'waf360-tag';
const BLOCKED = Symbol('transfonSecurityBlocked');
const STARTED = Symbol('transfonSecurityStarted');
const APPLIED = Symbol('transfonSecurityApplied');

const storageManager = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });

let verdictPromise = null;
let verdict = null;
let page = null;
// keyed by adUnitCodes, the one array core passes from the request to the
// auction, since publishers may reuse an auctionId
let applied = new WeakMap();

let hooksInstalled = false;

export function reset() {
  verdictPromise = null;
  verdict = null;
  page = null;
  applied = new WeakMap();
}

/**
 * @param {{params?: TransfonSecurityRtdProviderParams}} config
 */
function getParams(config) {
  const params = config?.params || {};
  return {
    licenseId: typeof params.licenseId === 'string' ? params.licenseId.trim() : '',
    blockIvt: params.blockIvt === true,
    timeout: Number(params.timeout) > 0 ? Number(params.timeout) : DEFAULT_TIMEOUT
  };
}

function allowed(activity, params) {
  return isActivityAllowed(activity, activityParams(MODULE_TYPE_RTD, SUBMODULE_NAME, params));
}

function sessionCookieAllowed() {
  return allowed(ACTIVITY_ACCESS_REQUEST_CREDENTIALS) && cookieAllowed(SESSION_COOKIE);
}

function hasSecurityTag() {
  return typeof window._waf360?.check === 'function';
}

function cookieAllowed(name) {
  return [false, true].every((write) => allowed(ACTIVITY_ACCESS_DEVICE, {
    [ACTIVITY_PARAM_STORAGE_TYPE]: 'cookie',
    [ACTIVITY_PARAM_STORAGE_KEY]: name,
    [ACTIVITY_PARAM_STORAGE_WRITE]: write
  }));
}

function uidAllowed() {
  return allowed(ACTIVITY_REPORT_ANALYTICS) && allowed(ACTIVITY_TRANSMIT_EIDS) && cookieAllowed(UID_COOKIE);
}

function readUid() {
  try {
    return storageManager.getCookie(UID_COOKIE);
  } catch (e) {
    // a value that cannot be decoded is replaced
    return null;
  }
}

function visitorId() {
  if (!uidAllowed()) {
    return null;
  }
  try {
    if (!storageManager.cookiesAreEnabled()) {
      return null;
    }
    let uid = readUid();
    if (!uid) {
      uid = generateUUID();
      storageManager.setCookie(UID_COOKIE, uid, new Date(Date.now() + UID_DAYS * 86400000).toUTCString(), 'Lax');
    }
    return uid;
  } catch (e) {
    // cookies can throw, for example in a sandboxed frame
    return null;
  }
}

// Returns false only when the script threw.
function queueCall(globalName, name, ...args) {
  const target = window[globalName] = window[globalName] || {};
  if (typeof target[name] === 'function') {
    try {
      target[name](...args);
    } catch (e) {
      logError(`${LOG_PREFIX} ${globalName}.${name} failed`, e);
      return false;
    }
  } else {
    target.q = target.q || [];
    target.q.push([name, ...args]);
  }
  return true;
}

// Replaces a queued init in place, so a queued check never runs with stale permissions.
function configureTag(key, options) {
  const target = window._waf360rtd = window._waf360rtd || {};
  if (typeof target.init !== 'function' && Array.isArray(target.q)) {
    const queued = target.q.findIndex(([name, queuedKey]) => name === 'init' && queuedKey === key);
    if (queued >= 0) {
      target.q[queued] = ['init', key, options];
      return true;
    }
  }
  return queueCall('_waf360rtd', 'init', key, options);
}

// The Transfon Security tag on the page decides its own storage use.
function securityTag() {
  return {
    ready: Promise.resolve(),
    available: () => true,
    refresh: () => true,
    check: (callback) => queueCall('_waf360', 'check', callback),
    report: (kv) => {
      const tag = window._waf360 = window._waf360 || {};
      if (typeof tag.send === 'function') {
        queueCall('_waf360', 'send', 'auction', kv);
      } else {
        // the tag replays its queue as [event, payload]
        tag.q = tag.q || [];
        tag.q.push(['auction', kv]);
      }
    }
  };
}

// The tag element is on the page but its script has not run yet, or failed.
function loadingSecurityTag(element, licenseId, timeout) {
  let inner = null;
  let requested = false;
  const tag = {
    ready: new Promise((resolve) => {
      element.addEventListener('load', resolve);
      element.addEventListener('error', resolve);
      setTimeout(resolve, timeout);
    }).then(() => {
      if (page?.tag === tag) {
        inner = hasSecurityTag() ? securityTag() : rtdTag(licenseId, tag);
        if (requested) {
          inner.refresh();
        }
        return inner.ready;
      }
    }),
    available: () => !!inner && inner.available(),
    refresh: () => {
      requested = true;
      return !!inner && inner.refresh();
    },
    check: (callback) => inner.check(callback),
    report: (kv) => inner?.report(kv)
  };
  return tag;
}

// Resolves false when rtd.js cannot be loaded, so auctions fail open at once.
// Another Prebid.js bundle may have loaded it, or be loading it.
function scriptLoaded() {
  return new Promise((resolve) => {
    if (typeof window._waf360rtd?.check === 'function') {
      resolve(true);
      return;
    }
    const loading = document.querySelector(`script[src="${RTD_TAG_URL}"]`);
    if (loading) {
      // the DOM does not replay a load or error event that already fired
      if (loading.hasAttribute(FAILED_ATTRIBUTE)) {
        resolve(false);
        return;
      }
      loading.addEventListener('load', () => resolve(true));
      loading.addEventListener('error', () => resolve(false));
      return;
    }
    // adloader calls callback.error synchronously for a load that already failed
    let script;
    let failed = false;
    const callback = () => resolve(true);
    callback.error = () => {
      failed = true;
      script?.setAttribute(FAILED_ATTRIBUTE, '');
      resolve(false);
    };
    try {
      script = loadExternalScript(RTD_TAG_URL, MODULE_TYPE_RTD, SUBMODULE_NAME, callback);
    } catch (e) {
      // for example under a Trusted Types policy that rejects the script URL
      logError(`${LOG_PREFIX} cannot load ${RTD_TAG_URL}`, e);
      script = null;
    }
    if (!script) {
      resolve(false);
    } else if (failed) {
      script.setAttribute(FAILED_ATTRIBUTE, '');
    }
  });
}

// The script loads at init, once Prebid has processed the publisher's setup, so
// loadExternalScript rules from the same setConfig apply. Storage is decided and
// the page checked from the first auction on, where consent is on the request,
// and decided again before each auction and report.
function rtdTag(licenseId, owner) {
  const current = () => page?.tag === (owner || tag);
  // keeps this bundle's license and decisions apart from other bundles sharing rtd.js
  const key = generateUUID();
  let started = false;
  let decided = null;
  let requested = false;
  const configure = () => {
    const coppa = allConsent.getConsentData()?.coppa === true;
    const storage = !coppa && sessionCookieAllowed();
    const report = allowed(ACTIVITY_REPORT_ANALYTICS);
    const keepUid = storage && report && uidAllowed();
    const decision = `${storage}|${report}|${keepUid}`;
    if (decision !== decided) {
      const accepted = configureTag(key, {
        license: licenseId,
        storage,
        report,
        uid: keepUid ? visitorId() : null
      });
      // a failed call is retried
      decided = accepted ? decision : null;
    }
    if (decided !== null) {
      configured();
    }
  };
  let configured;
  const ready = new Promise((resolve) => { configured = resolve; });
  let available = true;
  // deferred until init has recorded this tag: with GREEDY, settled core promises run callbacks synchronously
  Promise.resolve().then(() => hooksReady).then(() => current() && scriptLoaded()).then((loaded) => {
    if (!current()) {
      return;
    }
    if (!loaded) {
      available = false;
      configured();
      return;
    }
    started = true;
    if (requested) {
      configure();
    }
  }).catch((e) => {
    logError(`${LOG_PREFIX} cannot start`, e);
    if (!started) {
      available = false;
      configured();
    }
  });
  const tag = {
    ready,
    available: () => available,
    // true once the script holds the current decisions
    refresh: () => {
      requested = true;
      if (started) {
        configure();
      }
      return decided !== null;
    },
    check: (callback) => queueCall('_waf360rtd', 'check', key, callback),
    report: (kv) => queueCall('_waf360rtd', 'report', key, kv)
  };
  return tag;
}

function report(outcome, current) {
  if (current !== page || page.reported) {
    return;
  }
  page.reported = true;
  // no report while the script may hold storage or an id it should have dropped
  if (!page.tag.refresh() || !allowed(ACTIVITY_REPORT_ANALYTICS)) {
    return;
  }
  page.tag.report({
    src: 'prebid',
    pa: '1',
    vs: outcome.status,
    vt: page.settledAt != null && page.startedAt != null ? String(page.settledAt - page.startedAt) : '',
    ad: String(outcome.auctionDelay),
    qs: outcome.qs,
    bv: outcome.blockIvt ? '1' : '0',
    bi: outcome.removed ? '1' : '0'
  });
}

export function getTssQs(data) {
  return data?.qs === false ? 0 : 1;
}

export function shouldBlock(data) {
  return getTssQs(data) === 0 || data?.block === true;
}

function init(config) {
  const { licenseId, timeout } = getParams(config);
  if (!LICENSE_ID.test(licenseId)) {
    logError(`${LOG_PREFIX} params.licenseId must be a 10 character Transfon Security license`);
    return false;
  }
  reset();
  installHooks();
  const element = document.getElementById(SECURITY_TAG_ID);
  const tag = hasSecurityTag() ? securityTag() : element ? loadingSecurityTag(element, licenseId, timeout) : rtdTag(licenseId);
  page = { tag, startedAt: null, settledAt: null, reported: false };
  const current = page;
  verdictPromise = tag.ready.then(() => !tag.available() ? null : new Promise((resolve) => {
    current.startedAt = Date.now();
    const timer = setTimeout(() => resolve(null), timeout);
    tag.check((data) => {
      clearTimeout(timer);
      resolve(data);
    });
  })).then((data) => {
    if (current !== page) {
      return null;
    }
    current.settledAt = Date.now();
    verdict = data && typeof data.qs === 'boolean' ? data : null;
    if (!verdict) {
      logInfo(`${LOG_PREFIX} verdict unavailable`);
    }
    return verdict;
  });
  return true;
}

// Ad units are kept for tss_qs targeting. ortb2Imp is dropped, since an ad unit
// with it would still go to Prebid Server as a stored impression.
function blockedAdUnits(adUnits) {
  return (adUnits || []).map(({ ortb2Imp, ...adUnit }) => {
    const banner = adUnit.mediaTypes?.banner;
    const format = ortb2Imp?.banner?.format;
    if (banner && format && !banner.sizes && !banner.format) {
      adUnit = { ...adUnit, mediaTypes: { ...adUnit.mediaTypes, banner: { ...banner, format } } };
    }
    return { ...adUnit, bids: [] };
  });
}

// beforeRequestBids handlers run inside makeBidRequests, after every startAuction
// hook, and may add bids back, so a blocked request's bidder requests are dropped
// there too. Requests are keyed by ortb2Fragments, which core passes unchanged to
// makeBidRequests, since publishers may reuse an auctionId.
const blockedRequests = new WeakSet();
let blockingCall = false;

export function noteBlockedCall(next, ...args) {
  blockingCall = blockedRequests.has(args[5]);
  next.apply(this, args);
}

export function dropBlockedRequests(next, bidderRequests) {
  const block = blockingCall;
  blockingCall = false;
  next.call(this, block ? [] : bidderRequests);
}

// A verdict that arrives after this hook missed auctionDelay.
export function markStarted(next, reqBidsConfigObj) {
  if (reqBidsConfigObj) {
    reqBidsConfigObj[STARTED] = true;
  }
  next.call(this, reqBidsConfigObj);
}

// Other providers that settle late may rebuild the ad units, so the block is
// applied again after every other startAuction hook.
export function enforceBlock(next, reqBidsConfigObj) {
  if (reqBidsConfigObj && verdictPromise) {
    const blocked = reqBidsConfigObj[BLOCKED];
    if (blocked) {
      delete reqBidsConfigObj[BLOCKED];
      reqBidsConfigObj.adUnits = blockedAdUnits(blocked);
      reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
      blockedRequests.add(reqBidsConfigObj.ortb2Fragments);
    }
    if (Array.isArray(reqBidsConfigObj.adUnitCodes)) {
      applied.set(reqBidsConfigObj.adUnitCodes, reqBidsConfigObj[APPLIED] === true);
    }
  }
  next.call(this, reqBidsConfigObj);
}

function installHooks() {
  if (!hooksInstalled) {
    const startAuction = getHook('startAuction');
    startAuction.before(markStarted, RTD_DONE_PRIORITY);
    startAuction.before(enforceBlock, FINAL_PRIORITY);
    adapterManager.makeBidRequests.before(noteBlockedCall);
    adapterManager.makeBidRequests.after(dropBlockedRequests);
    hooksInstalled = true;
  }
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent, auctionDelay = 0) {
  const { blockIvt, timeout } = getParams(config);
  if (!verdictPromise) {
    callback();
    return;
  }
  page.tag.refresh();
  const settledBefore = page.settledAt != null;
  let timer;
  const verdictOrTimeout = Promise.race([
    verdictPromise,
    new Promise((resolve) => { timer = setTimeout(() => resolve(null), timeout); })
  ]);
  verdictOrTimeout.then((data) => {
    clearTimeout(timer);
    // another provider may still hold a request this module stopped waiting for
    const late = !settledBefore && reqBidsConfigObj[STARTED] === true;
    let removed = false;
    if (data && !late) {
      reqBidsConfigObj[APPLIED] = true;
      deepSetValue(reqBidsConfigObj, `ortb2Fragments.global.site.ext.data.${TARGETING_KEY}`, getTssQs(data));
      if (blockIvt && shouldBlock(data)) {
        const adUnits = blockedAdUnits(reqBidsConfigObj.adUnits);
        reqBidsConfigObj.adUnits = adUnits;
        reqBidsConfigObj[BLOCKED] = adUnits;
        removed = true;
        logInfo(`${LOG_PREFIX} bid requests removed (${getTssQs(data) === 0 ? 'tss_qs = 0' : 'block rule'})`);
      }
    }
    const outcome = {
      status: !data ? 'none' : (late ? 'late' : 'ok'),
      qs: data && !late ? String(getTssQs(data)) : '',
      auctionDelay,
      blockIvt,
      removed
    };
    // the report waits for the page verdict, so its timing is known
    const current = page;
    verdictPromise.then(() => report(outcome, current));
    callback();
  });
}

// Only a verdict that reached the auction's request goes to the ad server.
function inTime(adUnitCodes, auction) {
  const codes = auction?.adUnitCodes || adUnitCodes;
  if (codes && applied.has(codes)) {
    return applied.get(codes);
  }
  return !(auction?.timestamp != null && page?.settledAt > auction.timestamp);
}

function getTargetingData(adUnitCodes, config, userConsent, auction) {
  if (!verdict || !inTime(adUnitCodes, auction)) {
    return {};
  }
  const value = String(getTssQs(verdict));
  return adUnitCodes.reduce((targeting, code) => {
    targeting[code] = { [TARGETING_KEY]: value };
    return targeting;
  }, {});
}

export const transfonSecuritySubmodule = {
  name: SUBMODULE_NAME,
  gvlid: GVLID,
  init,
  getBidRequestData,
  getTargetingData
};

submodule('realTimeData', transfonSecuritySubmodule);
