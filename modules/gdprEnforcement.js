/**
 * This module gives publishers extra set of features to enforce individual purposes of TCF v2
 */

import {deepAccess, hasDeviceAccess, logError, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import adapterManager, {gdprDataHandler} from '../src/adapterManager.js';
import {find} from '../src/polyfill.js';
import {getHook} from '../src/hook.js';
import {validateStorageEnforcement} from '../src/storageManager.js';
import * as events from '../src/events.js';
import CONSTANTS from '../src/constants.json';
import {GDPR_GVLIDS, VENDORLESS_GVLID} from '../src/consentHandler.js';
import {
  MODULE_TYPE_ANALYTICS,
  MODULE_TYPE_BIDDER,
  MODULE_TYPE_PREBID, MODULE_TYPE_RTD,
  MODULE_TYPE_UID
} from '../src/activities/modules.js';
import {
  ACTIVITY_PARAM_ANL_CONFIG,
  ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE
} from '../src/activities/params.js';
import {registerActivityControl} from '../src/activities/rules.js';
import {
  ACTIVITY_ENRICH_EIDS,
  ACTIVITY_FETCH_BIDS,
  ACTIVITY_REPORT_ANALYTICS,
  ACTIVITY_SYNC_USER
} from '../src/activities/activities.js';

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

const storageBlocked = new Set();
const biddersBlocked = new Set();
const analyticsBlocked = new Set();

let hooksAdded = false;
let strictStorageEnforcement = false;

const GVLID_LOOKUP_PRIORITY = [
  MODULE_TYPE_BIDDER,
  MODULE_TYPE_UID,
  MODULE_TYPE_ANALYTICS,
  MODULE_TYPE_RTD
];

const RULE_NAME = 'TCF2';
const RULE_HANDLES = [];

/**
 * Retrieve a module's GVL ID.
 */
export function getGvlid(moduleType, moduleName, fallbackFn) {
  if (moduleName) {
    // Check user defined GVL Mapping in pbjs.setConfig()
    const gvlMapping = config.getConfig('gvlMapping');

    // Return GVL ID from user defined gvlMapping
    if (gvlMapping && gvlMapping[moduleName]) {
      return gvlMapping[moduleName];
    } else if (moduleType === MODULE_TYPE_PREBID) {
      return VENDORLESS_GVLID;
    } else {
      let {gvlid, modules} = GDPR_GVLIDS.get(moduleName);
      if (gvlid == null && Object.keys(modules).length > 0) {
        // this behavior is for backwards compatibility; if multiple modules with the same
        // name declare different GVL IDs, pick the bidder's first, then userId, then analytics
        for (const type of GVLID_LOOKUP_PRIORITY) {
          if (modules.hasOwnProperty(type)) {
            gvlid = modules[type];
            if (type !== moduleType) {
              logWarn(`Multiple GVL IDs found for module '${moduleName}'; using the ${type} module's ID (${gvlid}) instead of the ${moduleType}'s ID (${modules[moduleType]})`)
            }
            break;
          }
        }
      }
      if (gvlid == null && fallbackFn) {
        gvlid = fallbackFn();
      }
      return gvlid || null;
    }
  }
  return null;
}

/**
 * Retrieve GVL IDs that are dynamically set on analytics adapters.
 */
export function getGvlidFromAnalyticsAdapter(code, config) {
  const adapter = adapterManager.getAnalyticsAdapter(code);
  return ((gvlid) => {
    if (typeof gvlid !== 'function') return gvlid;
    try {
      return gvlid.call(adapter.adapter, config);
    } catch (e) {
      logError(`Error invoking ${code} adapter.gvlid()`, e)
    }
  })(adapter?.adapter?.gvlid)
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
 * @returns {boolean}
 */
export function validateRules(rule, consentData, currentModule, gvlId) {
  const purposeId = TCF2[Object.keys(TCF2).filter(purposeName => TCF2[purposeName].name === rule.purpose)[0]].id;

  // return 'true' if vendor present in 'vendorExceptions'
  if ((rule.vendorExceptions || []).includes(currentModule)) {
    return true;
  }
  const vendorConsentRequred = !((gvlId === VENDORLESS_GVLID || (rule.softVendorExceptions || []).includes(currentModule)))

  // get data from the consent string
  const purposeConsent = deepAccess(consentData, `vendorData.purpose.consents.${purposeId}`);
  const vendorConsent = vendorConsentRequred ? deepAccess(consentData, `vendorData.vendor.consents.${gvlId}`) : true;
  const liTransparency = deepAccess(consentData, `vendorData.purpose.legitimateInterests.${purposeId}`);

  /*
    Since vendor exceptions have already been handled, the purpose as a whole is allowed if it's not being enforced
    or the user has consented. Similar with vendors.
  */
  const purposeAllowed = rule.enforcePurpose === false || purposeConsent === true;
  const vendorAllowed = rule.enforceVendor === false || vendorConsent === true;

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
 *
 * @param {Function} fn reference to original function (used by hook logic)
 * @param {string} moduleType type of the module
 * @param {string=} moduleName name of the module
 * @param result
 * @param validate
 */
export function deviceAccessHook(fn, moduleType, moduleName, result, {validate = validateRules} = {}) {
  result = Object.assign({}, {
    hasEnforcementHook: true
  });
  if (!hasDeviceAccess()) {
    logWarn('Device access is disabled by Publisher');
    result.valid = false;
  } else if (moduleType === MODULE_TYPE_PREBID && !strictStorageEnforcement) {
    // for vendorless (core) storage, do not enforce rules unless strictStorageEnforcement is set
    result.valid = true;
  } else {
    const consentData = gdprDataHandler.getConsentData();
    let gvlid;
    if (shouldEnforce(consentData, 1, moduleName)) {
      const curBidder = config.getCurrentBidder();
      // Bidders have a copy of storage object with bidder code binded. Aliases will also pass the same bidder code when invoking storage functions and hence if alias tries to access device we will try to grab the gvl id for alias instead of original bidder
      if (curBidder && (curBidder !== moduleName) && adapterManager.aliasRegistry[curBidder] === moduleName) {
        gvlid = getGvlid(moduleType, curBidder);
      } else {
        gvlid = getGvlid(moduleType, moduleName)
      }
      const curModule = moduleName || curBidder;
      let isAllowed = validate(purpose1Rule, consentData, curModule, gvlid,);
      if (isAllowed) {
        result.valid = true;
      } else {
        curModule && logWarn(`TCF2 denied device access for ${curModule}`);
        result.valid = false;
        storageBlocked.add(curModule);
      }
    } else {
      result.valid = true;
    }
  }
  fn.call(this, moduleType, moduleName, result);
}

/**
 * all activity rules follow the same structure:
 * if GDPR is in scope, check configuration for a particular purpose
 *
 * @param purposeNo TCF purpose number to check for this activity
 * @param getEnforcementRule getter for gdprEnforcement rule definition to use
 * @param blocked optional set to use for collecting denied vendors
 * @param gvlidFallback optional factory function for a gvlid falllback function
 */
function gdprRule(purposeNo, getEnforcementRule, blocked = null, gvlidFallback = () => null) {
  return function (params) {
    const consentData = gdprDataHandler.getConsentData();
    const modName = params[ACTIVITY_PARAM_COMPONENT_NAME];
    if (shouldEnforce(consentData, purposeNo, modName)) {
      const gvlid = getGvlid(params[ACTIVITY_PARAM_COMPONENT_TYPE], modName, gvlidFallback(params));
      let allow = !!validateRules(getEnforcementRule(), consentData, modName, gvlid);
      if (!allow) {
        blocked && blocked.add(modName);
        return {allow};
      }
    }
  }
}

export const syncUserRule = gdprRule(1, () => purpose1Rule, storageBlocked);
export const enrichEidsRule = gdprRule(1, () => purpose1Rule, storageBlocked)

export function userIdHook(fn, submodules, consentData) {
  // TODO: remove this in v8 (https://github.com/prebid/Prebid.js/issues/9766)
  if (shouldEnforce(consentData, 1, 'User ID')) {
    fn.call(this, submodules, { ...consentData, hasValidated: true });
  } else {
    fn.call(this, submodules, consentData);
  }
}

export const fetchBidsRule = ((rule) => {
  return function (params) {
    if (params[ACTIVITY_PARAM_COMPONENT_TYPE] !== MODULE_TYPE_BIDDER) {
      // TODO: this special case is for the PBS adapter (componentType is core)
      // we should check for generic purpose 2 consent & vendor consent based on the PBS vendor's GVL ID;
      // that is, however, a breaking change and skipped for now
      return;
    }
    return rule(params);
  }
})(gdprRule(2, () => purpose2Rule, biddersBlocked))

export const reportAnalyticsRule = gdprRule(7, () => purpose7Rule, analyticsBlocked, (params) => getGvlidFromAnalyticsAdapter(params[ACTIVITY_PARAM_COMPONENT_NAME], params[ACTIVITY_PARAM_ANL_CONFIG]))

/**
 * Compiles the TCF2.0 enforcement results into an object, which is emitted as an event payload to "tcf2Enforcement" event.
 */
function emitTCF2FinalResults() {
  // remove null and duplicate values
  const formatSet = function (st) {
    return Array.from(st.keys()).filter(el => el != null);
  }
  const tcf2FinalResults = {
    storageBlocked: formatSet(storageBlocked),
    biddersBlocked: formatSet(biddersBlocked),
    analyticsBlocked: formatSet(analyticsBlocked)
  };

  events.emit(CONSTANTS.EVENTS.TCF2_ENFORCEMENT, tcf2FinalResults);
  [storageBlocked, biddersBlocked, analyticsBlocked].forEach(el => el.clear());
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
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_SYNC_USER, RULE_NAME, syncUserRule))
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_ENRICH_EIDS, RULE_NAME, enrichEidsRule));
      // TODO: remove this hook in v8 (https://github.com/prebid/Prebid.js/issues/9766)
      getHook('validateGdprEnforcement').before(userIdHook, 47);
    }
    if (purpose2Rule) {
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_FETCH_BIDS, RULE_NAME, fetchBidsRule));
    }
    if (purpose7Rule) {
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_REPORT_ANALYTICS, RULE_NAME, reportAnalyticsRule))
    }
  }
}

export function uninstall() {
  while (RULE_HANDLES.length) RULE_HANDLES.pop()();
  [
    validateStorageEnforcement.getHooks({hook: deviceAccessHook}),
    getHook('validateGdprEnforcement').getHooks({hook: userIdHook}),
  ].forEach(hook => hook.remove());
  hooksAdded = false;
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
