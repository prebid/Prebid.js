/**
 * This module gives publishers extra set of features to enforce individual purposes of TCF v2
 */

import {deepAccess, hasDeviceAccess, isArray, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import adapterManager, {gdprDataHandler} from '../src/adapterManager.js';
import {find, includes} from '../src/polyfill.js';
import {registerSyncInner} from '../src/adapters/bidderFactory.js';
import {getHook} from '../src/hook.js';
import {validateStorageEnforcement} from '../src/storageManager.js';
import * as events from '../src/events.js';
import CONSTANTS from '../src/constants.json';

// modules for which vendor consent is not needed (see https://github.com/prebid/Prebid.js/issues/8161)
const VENDORLESS_MODULES = new Set([
  'sharedId',
  'pubCommonId',
  'pubProvidedId',
]);

export const STRICT_STORAGE_ENFORCEMENT = 'strictStorageEnforcement';

const TCF2 = {
  'purpose1': { id: 1, name: 'storage' },
  'purpose2': { id: 2, name: 'basicAds' },
  'purpose7': { id: 7, name: 'measurement' }
}

/*
  These rules would be used if `consentManagement.gdpr.rules` is undefined by the publisher.
*/
const DEFAULT_RULES = [{
  purpose: 'storage',
  enforcePurpose: true,
  enforceVendor: true,
  vendorExceptions: []
}, {
  purpose: 'basicAds',
  enforcePurpose: true,
  enforceVendor: true,
  vendorExceptions: []
}];

export let purpose1Rule;
export let purpose2Rule;
export let purpose7Rule;

export let enforcementRules;

const storageBlocked = [];
const biddersBlocked = [];
const analyticsBlocked = [];

let hooksAdded = false;
let strictStorageEnforcement = false;

// Helps in stubbing these functions in unit tests.
export const internal = {
  getGvlidForBidAdapter,
  getGvlidForUserIdModule,
  getGvlidForAnalyticsAdapter
};

/**
 * Returns GVL ID for a Bid adapter / an USERID submodule / an Analytics adapter.
 * If modules of different types have the same moduleCode: For example, 'appnexus' is the code for both Bid adapter and Analytics adapter,
 * then, we assume that their GVL IDs are same. This function first checks if GVL ID is defined for a Bid adapter, if not found, tries to find User ID
 * submodule's GVL ID, if not found, tries to find Analytics adapter's GVL ID. In this process, as soon as it finds a GVL ID, it returns it
 * without going to the next check.
 * @param {{string|Object}} - module
 * @return {number} - GVL ID
 */
export function getGvlid(module) {
  let gvlid = null;
  if (module) {
    // Check user defined GVL Mapping in pbjs.setConfig()
    const gvlMapping = config.getConfig('gvlMapping');

    // For USER ID Module, we pass the submodule object itself as the "module" parameter, this check is required to grab the module code
    const moduleCode = typeof module === 'string' ? module : module.name;

    // Return GVL ID from user defined gvlMapping
    if (gvlMapping && gvlMapping[moduleCode]) {
      gvlid = gvlMapping[moduleCode];
      return gvlid;
    }

    gvlid = internal.getGvlidForBidAdapter(moduleCode) || internal.getGvlidForUserIdModule(module) || internal.getGvlidForAnalyticsAdapter(moduleCode);
  }
  return gvlid;
}

/**
 * Returns GVL ID for a bid adapter. If the adapter does not have an associated GVL ID, it returns 'null'.
 * @param  {string=} bidderCode - The 'code' property of the Bidder spec.
 * @return {number} GVL ID
 */
function getGvlidForBidAdapter(bidderCode) {
  let gvlid = null;
  bidderCode = bidderCode || config.getCurrentBidder();
  if (bidderCode) {
    const bidder = adapterManager.getBidAdapter(bidderCode);
    if (bidder && bidder.getSpec) {
      gvlid = bidder.getSpec().gvlid;
    }
  }
  return gvlid;
}

/**
 * Returns GVL ID for an userId submodule. If an userId submodules does not have an associated GVL ID, it returns 'null'.
 * @param {Object} userIdModule
 * @return {number} GVL ID
 */
function getGvlidForUserIdModule(userIdModule) {
  return (typeof userIdModule === 'object' ? userIdModule.gvlid : null);
}

/**
 * Returns GVL ID for an analytics adapter. If an analytics adapter does not have an associated GVL ID, it returns 'null'.
 * @param {string} code - 'provider' property on the analytics adapter config
 * @return {number} GVL ID
 */
function getGvlidForAnalyticsAdapter(code) {
  return adapterManager.getAnalyticsAdapter(code) && (adapterManager.getAnalyticsAdapter(code).gvlid || null);
}

export function shouldEnforce(consentData, purpose, name) {
  if (consentData == null && gdprDataHandler.enabled) {
    // there is no consent data, but the GDPR module has been installed and configured
    // NOTE: this check is not foolproof, as when Prebid first loads, enforcement hooks have not been attached yet
    // This piece of code would not run at all, and `gdprDataHandler.enabled` would be false, until the first
    // `setConfig({consentManagement})`
    logWarn(`Attempting operation that requires purpose ${purpose} consent while consent data is not available${name ? ` (module: ${name})` : ''}. Assuming no consent was given.`)
    return true;
  }
  return consentData && consentData.gdprApplies;
}

/**
 * This function takes in a rule and consentData and validates against the consentData provided. Depending on what it returns,
 * the caller may decide to suppress a TCF-sensitive activity.
 * @param {Object} rule - enforcement rules set in config
 * @param {Object} consentData - gdpr consent data
 * @param {string=} currentModule - Bidder code of the current module
 * @param {number=} gvlId - GVL ID for the module
 * @param vendorlessModule a predicate function that takes a module name, and returns true if the module does not need vendor consent
 * @returns {boolean}
 */
export function validateRules(rule, consentData, currentModule, gvlId, vendorlessModule = VENDORLESS_MODULES.has.bind(VENDORLESS_MODULES)) {
  const purposeId = TCF2[Object.keys(TCF2).filter(purposeName => TCF2[purposeName].name === rule.purpose)[0]].id;

  // return 'true' if vendor present in 'vendorExceptions'
  if (includes(rule.vendorExceptions || [], currentModule)) {
    return true;
  }

  // get data from the consent string
  const purposeConsent = deepAccess(consentData, `vendorData.purpose.consents.${purposeId}`);
  const vendorConsent = deepAccess(consentData, `vendorData.vendor.consents.${gvlId}`);
  const liTransparency = deepAccess(consentData, `vendorData.purpose.legitimateInterests.${purposeId}`);

  /*
    Since vendor exceptions have already been handled, the purpose as a whole is allowed if it's not being enforced
    or the user has consented. Similar with vendors.
  */
  const purposeAllowed = rule.enforcePurpose === false || purposeConsent === true;
  const vendorAllowed = vendorlessModule(currentModule) || rule.enforceVendor === false || vendorConsent === true;

  /*
    Few if any vendors should be declaring Legitimate Interest for Device Access (Purpose 1), but some are claiming
    LI for Basic Ads (Purpose 2). Prebid.js can't check to see who's declaring what legal basis, so if LI has been
    established for Purpose 2, allow the auction to take place and let the server sort out the legal basis calculation.
  */
  if (purposeId === 2) {
    return (purposeAllowed && vendorAllowed) || (liTransparency === true);
  }

  return purposeAllowed && vendorAllowed;
}

/**
 * This hook checks whether module has permission to access device or not. Device access include cookie and local storage
 * @param {Function} fn reference to original function (used by hook logic)
 * @param isVendorless if true, do not require vendor consent (for e.g. core modules)
 * @param {Number=} gvlid gvlid of the module
 * @param {string=} moduleName name of the module
 * @param result
 */
export function deviceAccessHook(fn, isVendorless, gvlid, moduleName, result, {validate = validateRules} = {}) {
  result = Object.assign({}, {
    hasEnforcementHook: true
  });
  if (!hasDeviceAccess()) {
    logWarn('Device access is disabled by Publisher');
    result.valid = false;
  } else if (isVendorless && !strictStorageEnforcement) {
    // for vendorless (core) storage, do not enforce rules unless strictStorageEnforcement is set
    result.valid = true;
  } else {
    const consentData = gdprDataHandler.getConsentData();
    if (shouldEnforce(consentData, 1, moduleName)) {
      const curBidder = config.getCurrentBidder();
      // Bidders have a copy of storage object with bidder code binded. Aliases will also pass the same bidder code when invoking storage functions and hence if alias tries to access device we will try to grab the gvl id for alias instead of original bidder
      if (curBidder && (curBidder != moduleName) && adapterManager.aliasRegistry[curBidder] === moduleName) {
        gvlid = getGvlid(curBidder);
      } else {
        gvlid = getGvlid(moduleName) || gvlid;
      }
      const curModule = moduleName || curBidder;
      let isAllowed = validate(purpose1Rule, consentData, curModule, gvlid, isVendorless ? () => true : undefined);
      if (isAllowed) {
        result.valid = true;
      } else {
        curModule && logWarn(`TCF2 denied device access for ${curModule}`);
        result.valid = false;
        storageBlocked.push(curModule);
      }
    } else {
      result.valid = true;
    }
  }
  fn.call(this, isVendorless, gvlid, moduleName, result);
}

/**
 * This hook checks if a bidder has consent for user sync or not
 * @param {Function} fn reference to original function (used by hook logic)
 * @param  {...any} args args
 */
export function userSyncHook(fn, ...args) {
  const consentData = gdprDataHandler.getConsentData();
  const curBidder = config.getCurrentBidder();
  if (shouldEnforce(consentData, 1, curBidder)) {
    const gvlid = getGvlid(curBidder);
    let isAllowed = validateRules(purpose1Rule, consentData, curBidder, gvlid);
    if (isAllowed) {
      fn.call(this, ...args);
    } else {
      logWarn(`User sync not allowed for ${curBidder}`);
      storageBlocked.push(curBidder);
    }
  } else {
    fn.call(this, ...args);
  }
}

/**
 * This hook checks if user id module is given consent or not
 * @param {Function} fn reference to original function (used by hook logic)
 * @param  {Submodule[]} submodules Array of user id submodules
 * @param {Object} consentData GDPR consent data
 */
export function userIdHook(fn, submodules, consentData) {
  if (shouldEnforce(consentData, 1, 'User ID')) {
    let userIdModules = submodules.map((submodule) => {
      const gvlid = getGvlid(submodule.submodule);
      const moduleName = submodule.submodule.name;
      let isAllowed = validateRules(purpose1Rule, consentData, moduleName, gvlid);
      if (isAllowed) {
        return submodule;
      } else {
        logWarn(`User denied permission to fetch user id for ${moduleName} User id module`);
        storageBlocked.push(moduleName);
      }
      return undefined;
    }).filter(module => module)
    fn.call(this, userIdModules, { ...consentData, hasValidated: true });
  } else {
    fn.call(this, submodules, consentData);
  }
}

/**
 * Checks if bidders are allowed in the auction.
 * Enforces "purpose 2 (Basic Ads)" of TCF v2.0 spec
 * @param {Function} fn - Function reference to the original function.
 * @param {Array<adUnits>} adUnits
 */
export function makeBidRequestsHook(fn, adUnits, ...args) {
  const consentData = gdprDataHandler.getConsentData();
  if (shouldEnforce(consentData, 2)) {
    adUnits.forEach(adUnit => {
      adUnit.bids = adUnit.bids.filter(bid => {
        const currBidder = bid.bidder;
        const gvlId = getGvlid(currBidder);
        if (includes(biddersBlocked, currBidder)) return false;
        const isAllowed = !!validateRules(purpose2Rule, consentData, currBidder, gvlId);
        if (!isAllowed) {
          logWarn(`TCF2 blocked auction for ${currBidder}`);
          biddersBlocked.push(currBidder);
        }
        return isAllowed;
      });
    });
    fn.call(this, adUnits, ...args);
  } else {
    fn.call(this, adUnits, ...args);
  }
}

/**
 * Checks if Analytics adapters are allowed to send data to their servers for furhter processing.
 * Enforces "purpose 7 (Measurement)" of TCF v2.0 spec
 * @param {Function} fn - Function reference to the original function.
 * @param {Array<AnalyticsAdapterConfig>} config - Configuration object passed to pbjs.enableAnalytics()
 */
export function enableAnalyticsHook(fn, config) {
  const consentData = gdprDataHandler.getConsentData();
  if (shouldEnforce(consentData, 7, 'Analytics')) {
    if (!isArray(config)) {
      config = [config]
    }
    config = config.filter(conf => {
      const analyticsAdapterCode = conf.provider;
      const gvlid = getGvlid(analyticsAdapterCode);
      const isAllowed = !!validateRules(purpose7Rule, consentData, analyticsAdapterCode, gvlid);
      if (!isAllowed) {
        analyticsBlocked.push(analyticsAdapterCode);
        logWarn(`TCF2 blocked analytics adapter ${conf.provider}`);
      }
      return isAllowed;
    });
    fn.call(this, config);
  } else {
    fn.call(this, config);
  }
}

/**
 * Compiles the TCF2.0 enforcement results into an object, which is emitted as an event payload to "tcf2Enforcement" event.
 */
function emitTCF2FinalResults() {
  // remove null and duplicate values
  const formatArray = function (arr) {
    return arr.filter((i, k) => i !== null && arr.indexOf(i) === k);
  }
  const tcf2FinalResults = {
    storageBlocked: formatArray(storageBlocked),
    biddersBlocked: formatArray(biddersBlocked),
    analyticsBlocked: formatArray(analyticsBlocked)
  };

  events.emit(CONSTANTS.EVENTS.TCF2_ENFORCEMENT, tcf2FinalResults);
}

events.on(CONSTANTS.EVENTS.AUCTION_END, emitTCF2FinalResults);

/*
  Set of callback functions used to detect presence of a TCF rule, passed as the second argument to find().
*/
const hasPurpose1 = (rule) => { return rule.purpose === TCF2.purpose1.name }
const hasPurpose2 = (rule) => { return rule.purpose === TCF2.purpose2.name }
const hasPurpose7 = (rule) => { return rule.purpose === TCF2.purpose7.name }

/**
 * A configuration function that initializes some module variables, as well as adds hooks
 * @param {Object} config - GDPR enforcement config object
 */
export function setEnforcementConfig(config) {
  const rules = deepAccess(config, 'gdpr.rules');
  if (!rules) {
    logWarn('TCF2: enforcing P1 and P2 by default');
    enforcementRules = DEFAULT_RULES;
  } else {
    enforcementRules = rules;
  }
  strictStorageEnforcement = !!deepAccess(config, STRICT_STORAGE_ENFORCEMENT);

  purpose1Rule = find(enforcementRules, hasPurpose1);
  purpose2Rule = find(enforcementRules, hasPurpose2);
  purpose7Rule = find(enforcementRules, hasPurpose7);

  if (!purpose1Rule) {
    purpose1Rule = DEFAULT_RULES[0];
  }

  if (!purpose2Rule) {
    purpose2Rule = DEFAULT_RULES[1];
  }

  if (!hooksAdded) {
    if (purpose1Rule) {
      hooksAdded = true;
      validateStorageEnforcement.before(deviceAccessHook, 49);
      registerSyncInner.before(userSyncHook, 48);
      // Using getHook as user id and gdprEnforcement are both optional modules. Using import will auto include the file in build
      getHook('validateGdprEnforcement').before(userIdHook, 47);
    }
    if (purpose2Rule) {
      getHook('makeBidRequests').before(makeBidRequestsHook);
    }
    if (purpose7Rule) {
      getHook('enableAnalyticsCb').before(enableAnalyticsHook);
    }
  }
}

export function uninstall() {
  [
    validateStorageEnforcement.getHooks({hook: deviceAccessHook}),
    registerSyncInner.getHooks({hook: userSyncHook}),
    getHook('validateGdprEnforcement').getHooks({hook: userIdHook}),
    getHook('makeBidRequests').getHooks({hook: makeBidRequestsHook}),
    getHook('enableAnalyticsCb').getHooks({hook: enableAnalyticsHook}),
  ].forEach(hook => hook.remove());
  hooksAdded = false;
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
