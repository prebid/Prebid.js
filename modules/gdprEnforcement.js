/**
 * This module gives publishers extra set of features to enforce individual purposes of TCF v2
 */

import {deepAccess, logError, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import adapterManager, {gdprDataHandler} from '../src/adapterManager.js';
import {find} from '../src/polyfill.js';
import * as events from '../src/events.js';
import CONSTANTS from '../src/constants.json';
import {GDPR_GVLIDS, VENDORLESS_GVLID} from '../src/consentHandler.js';
import {
  MODULE_TYPE_ANALYTICS,
  MODULE_TYPE_BIDDER,
  MODULE_TYPE_PREBID,
  MODULE_TYPE_RTD,
  MODULE_TYPE_UID
} from '../src/activities/modules.js';
import {
  ACTIVITY_PARAM_ANL_CONFIG,
  ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE
} from '../src/activities/params.js';
import {registerActivityControl} from '../src/activities/rules.js';
import {
  ACTIVITY_ACCESS_DEVICE,
  ACTIVITY_ENRICH_EIDS, ACTIVITY_ENRICH_UFPD,
  ACTIVITY_FETCH_BIDS,
  ACTIVITY_REPORT_ANALYTICS,
  ACTIVITY_SYNC_USER, ACTIVITY_TRANSMIT_EIDS, ACTIVITY_TRANSMIT_UFPD
} from '../src/activities/activities.js';

export const STRICT_STORAGE_ENFORCEMENT = 'strictStorageEnforcement';

const TCF2 = {
  purpose1: {id: 1, name: 'storage'},
  purpose2: {id: 2, name: 'basicAds'},
  purpose4: {id: 4, name: 'personalizedAds'},
  purpose7: {id: 7, name: 'measurement'},
};

const DEFAULT_RULES = {
  1: {
    purpose: 'storage',
    enforcePurpose: true,
    enforceVendor: true,
    vendorExceptions: []
  },
  2: {
    purpose: 'basicAds',
    enforcePurpose: true,
    enforceVendor: true,
    vendorExceptions: []
  }
};

export const RULES = {};

export let enforcementRules;

const storageBlocked = new Set();
const biddersBlocked = new Set();
const analyticsBlocked = new Set();
const ufpdBlocked = new Set();
const eidsBlocked = new Set();

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

// in JS we do not have access to the GVL; assume that everyone declares legitimate interest for basic ads
const LI_PURPOSES = [2];

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
              logWarn(`Multiple GVL IDs found for module '${moduleName}'; using the ${type} module's ID (${gvlid}) instead of the ${moduleType}'s ID (${modules[moduleType]})`);
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
      logError(`Error invoking ${code} adapter.gvlid()`, e);
    }
  })(adapter?.adapter?.gvlid);
}

export function shouldEnforce(consentData, purpose, name) {
  if (consentData == null && gdprDataHandler.enabled) {
    // there is no consent data, but the GDPR module has been installed and configured
    // NOTE: this check is not foolproof, as when Prebid first loads, enforcement hooks have not been attached yet
    // This piece of code would not run at all, and `gdprDataHandler.enabled` would be false, until the first
    // `setConfig({consentManagement})`
    logWarn(`Attempting operation that requires purpose ${purpose} consent while consent data is not available${name ? ` (module: ${name})` : ''}. Assuming no consent was given.`);
    return true;
  }
  return consentData && consentData.gdprApplies;
}

function getConsent(consentData, purposeNo, gvlId) {
  let purpose = !!deepAccess(consentData, `vendorData.purpose.consents.${purposeNo}`);
  let vendor = !!deepAccess(consentData, `vendorData.vendor.consents.${gvlId}`);
  if (LI_PURPOSES.includes(purposeNo)) {
    purpose ||= !!deepAccess(consentData, `vendorData.purpose.legitimateInterests.${purposeNo}`);
    vendor ||= !!deepAccess(consentData, `vendorData.vendor.legitimateInterests.${gvlId}`);
  }
  return {purpose, vendor};
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
  const vendorConsentRequred = rule.enforceVendor && !((gvlId === VENDORLESS_GVLID || (rule.softVendorExceptions || []).includes(currentModule)));
  const {purpose, vendor} = getConsent(consentData, purposeId, gvlId);
  return (!rule.enforcePurpose || purpose) && (!vendorConsentRequred || vendor);
}

function gdprRule(purposeNo, checkConsent, blocked = null, gvlidFallback = () => null) {
  return function (params) {
    const consentData = gdprDataHandler.getConsentData();
    const modName = params[ACTIVITY_PARAM_COMPONENT_NAME];
    if (shouldEnforce(consentData, purposeNo, modName)) {
      const gvlid = getGvlid(params[ACTIVITY_PARAM_COMPONENT_TYPE], modName, gvlidFallback(params));
      let allow = !!checkConsent(consentData, modName, gvlid);
      if (!allow) {
        blocked && blocked.add(modName);
        return {allow};
      }
    }
  };
}

function singlePurposeGdprRule(purposeNo, blocked = null, gvlidFallback = () => null) {
  return gdprRule(purposeNo, (cd, modName, gvlid) => !!validateRules(RULES[purposeNo], cd, modName, gvlid), blocked, gvlidFallback);
}

function exceptPrebidModules(ruleFn) {
  return function (params) {
    if (params[ACTIVITY_PARAM_COMPONENT_TYPE] !== MODULE_TYPE_BIDDER) {
      // TODO: this special case is for the PBS adapter (componentType is 'prebid')
      // we should check for generic purpose 2 consent & vendor consent based on the PBS vendor's GVL ID;
      // that is, however, a breaking change and skipped for now
      return;
    }
    return ruleFn(params);
  };
}

export const accessDeviceRule = ((rule) => {
  return function (params) {
    // for vendorless (core) storage, do not enforce rules unless strictStorageEnforcement is set
    if (params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE_PREBID && !strictStorageEnforcement) return;
    return rule(params);
  };
})(singlePurposeGdprRule(1, storageBlocked));

export const syncUserRule = singlePurposeGdprRule(1, storageBlocked);
export const enrichEidsRule = singlePurposeGdprRule(1, storageBlocked);

export const fetchBidsRule = exceptPrebidModules(singlePurposeGdprRule(2, biddersBlocked));
export const reportAnalyticsRule = singlePurposeGdprRule(7, analyticsBlocked, (params) => getGvlidFromAnalyticsAdapter(params[ACTIVITY_PARAM_COMPONENT_NAME], params[ACTIVITY_PARAM_ANL_CONFIG]));
export const ufpdRule = singlePurposeGdprRule(4, ufpdBlocked);

export const transmitEidsRule = exceptPrebidModules((() => {
  // Transmit EID special case:
  // by default, legal basis or vendor exceptions for any purpose between 2 and 10
  // (but disregarding enforcePurpose and enforceVendor config) is enough to allow EIDs through
  function check2to10Consent(consentData, modName, gvlId) {
    for (let pno = 2; pno <= 10; pno++) {
      if (RULES[pno]?.vendorExceptions?.includes(modName)) {
        return true;
      }
      const {purpose, vendor} = getConsent(consentData, pno, gvlId);
      if (purpose && (vendor || RULES[pno]?.softVendorExceptions?.includes(modName))) {
        return true;
      }
    }
    return false;
  }

  const defaultBehavior = gdprRule('2-10', check2to10Consent, eidsBlocked);
  const p4Behavior = singlePurposeGdprRule(4, eidsBlocked);
  return function () {
    const fn = RULES[4]?.eidsRequireP4consent ? p4Behavior : defaultBehavior;
    return fn.apply(this, arguments);
  };
})());

/**
 * Compiles the TCF2.0 enforcement results into an object, which is emitted as an event payload to "tcf2Enforcement" event.
 */
function emitTCF2FinalResults() {
  // remove null and duplicate values
  const formatSet = function (st) {
    return Array.from(st.keys()).filter(el => el != null);
  };
  const tcf2FinalResults = {
    storageBlocked: formatSet(storageBlocked),
    biddersBlocked: formatSet(biddersBlocked),
    analyticsBlocked: formatSet(analyticsBlocked),
    ufpdBlocked: formatSet(ufpdBlocked),
    eidsBlocked: formatSet(eidsBlocked),
  };

  events.emit(CONSTANTS.EVENTS.TCF2_ENFORCEMENT, tcf2FinalResults);
  [storageBlocked, biddersBlocked, analyticsBlocked, ufpdBlocked, eidsBlocked].forEach(el => el.clear());
}

events.on(CONSTANTS.EVENTS.AUCTION_END, emitTCF2FinalResults);

function hasPurpose(purposeNo) {
  const pname = TCF2[`purpose${purposeNo}`].name;
  return (rule) => rule.purpose === pname;
}

/**
 * A configuration function that initializes some module variables, as well as adds hooks
 * @param {Object} config - GDPR enforcement config object
 */
export function setEnforcementConfig(config) {
  const rules = deepAccess(config, 'gdpr.rules');
  if (!rules) {
    logWarn('TCF2: enforcing P1 and P2 by default');
    enforcementRules = Object.values(DEFAULT_RULES);
  } else {
    enforcementRules = rules;
  }
  strictStorageEnforcement = !!deepAccess(config, STRICT_STORAGE_ENFORCEMENT);

  [1, 2, 4, 7].forEach(purposeNo => {
    RULES[purposeNo] = find(enforcementRules, hasPurpose(purposeNo)) ?? DEFAULT_RULES[purposeNo];
  });

  if (!hooksAdded) {
    if (RULES[1] != null) {
      hooksAdded = true;
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_ACCESS_DEVICE, RULE_NAME, accessDeviceRule));
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_SYNC_USER, RULE_NAME, syncUserRule));
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_ENRICH_EIDS, RULE_NAME, enrichEidsRule));
    }
    if (RULES[2] != null) {
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_FETCH_BIDS, RULE_NAME, fetchBidsRule));
    }
    if (RULES[4] != null) {
      RULE_HANDLES.push(
        registerActivityControl(ACTIVITY_TRANSMIT_UFPD, RULE_NAME, ufpdRule),
        registerActivityControl(ACTIVITY_ENRICH_UFPD, RULE_NAME, ufpdRule)
      );
    }
    if (RULES[7] != null) {
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_REPORT_ANALYTICS, RULE_NAME, reportAnalyticsRule));
    }
    RULE_HANDLES.push(registerActivityControl(ACTIVITY_TRANSMIT_EIDS, RULE_NAME, transmitEidsRule));
  }
}

export function uninstall() {
  while (RULE_HANDLES.length) RULE_HANDLES.pop()();
  hooksAdded = false;
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
