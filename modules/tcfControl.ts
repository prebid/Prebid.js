/**
 * This module gives publishers extra set of features to enforce individual purposes of TCF v2
 */

import {deepAccess, logError, logWarn} from '../src/utils.js';
import {config} from '../src/config.js';
import adapterManager, {gdprDataHandler} from '../src/adapterManager.js';
import * as events from '../src/events.js';
import {EVENTS} from '../src/constants.js';
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
  ACTIVITY_ACCESS_REQUEST_CREDENTIALS,
  ACTIVITY_ENRICH_EIDS,
  ACTIVITY_ENRICH_UFPD,
  ACTIVITY_FETCH_BIDS,
  ACTIVITY_REPORT_ANALYTICS,
  ACTIVITY_SYNC_USER,
  ACTIVITY_TRANSMIT_EIDS,
  ACTIVITY_TRANSMIT_PRECISE_GEO,
  ACTIVITY_TRANSMIT_UFPD
} from '../src/activities/activities.js';
import {processRequestOptions} from '../src/ajax.js';

export const STRICT_STORAGE_ENFORCEMENT = 'strictStorageEnforcement';

export const ACTIVE_RULES = {
  purpose: {},
  feature: {}
};

const CONSENT_PATHS = {
  purpose: false,
  feature: 'specialFeatureOptins'
};

const CONFIGURABLE_RULES = {
  storage: {
    type: 'purpose',
    default: {
      purpose: 'storage',
      enforcePurpose: true,
      enforceVendor: true,
      vendorExceptions: []
    },
    id: 1,
  },
  basicAds: {
    type: 'purpose',
    id: 2,
    default: {
      purpose: 'basicAds',
      enforcePurpose: true,
      enforceVendor: true,
      vendorExceptions: [],
      deferS2Sbidders: false
    }
  },
  personalizedAds: {
    type: 'purpose',
    id: 4,
    default: {
      purpose: 'personalizedAds',
      enforcePurpose: true,
      enforceVendor: true,
      vendorExceptions: [],
      eidsRequireP4Consent: false
    }
  },
  measurement: {
    type: 'purpose',
    id: 7,
    default: {
      purpose: 'measurement',
      enforcePurpose: true,
      enforceVendor: true,
      vendorExceptions: []
    }
  },
  transmitPreciseGeo: {
    type: 'feature',
    id: 1,
    default: {
      purpose: 'transmitPreciseGeo',
      enforcePurpose: true,
      enforceVendor: true,
      vendorExceptions: []
    }
  },
} as const;

const storageBlocked = new Set();
const biddersBlocked = new Set();
const analyticsBlocked = new Set();
const ufpdBlocked = new Set();
const eidsBlocked = new Set();
const geoBlocked = new Set();

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
const PUBLISHER_LI_PURPOSES = [2, 7, 9, 10];

declare module '../src/config' {
  interface Config {
    /**
     * Map from module name to that module's GVL ID. This overrides the GVL ID provided
     * by the modules themselves.
     */
    gvlMapping?: { [moduleName: string]: number }
  }
}
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

function getConsentOrLI(consentData, path, id, acceptLI) {
  const data = deepAccess(consentData, `vendorData.${path}`);
  return !!data?.consents?.[id] || (acceptLI && !!data?.legitimateInterests?.[id]);
}

function getConsent(consentData, type, purposeNo, gvlId) {
  let purpose;
  if (CONSENT_PATHS[type] !== false) {
    purpose = !!deepAccess(consentData, `vendorData.${CONSENT_PATHS[type]}.${purposeNo}`);
  } else {
    const [path, liPurposes] = gvlId === VENDORLESS_GVLID
      ? ['publisher', PUBLISHER_LI_PURPOSES]
      : ['purpose', LI_PURPOSES];
    purpose = getConsentOrLI(consentData, path, purposeNo, liPurposes.includes(purposeNo));
  }
  return {
    purpose,
    vendor: getConsentOrLI(consentData, 'vendor', gvlId, LI_PURPOSES.includes(purposeNo))
  }
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
export function validateRules(rule, consentData, currentModule, gvlId, params = {}) {
  const ruleOptions = CONFIGURABLE_RULES[rule.purpose];

  // return 'true' if vendor present in 'vendorExceptions'
  if ((rule.vendorExceptions || []).includes(currentModule)) {
    return true;
  }
  const vendorConsentRequred = rule.enforceVendor && !((gvlId === VENDORLESS_GVLID || (rule.softVendorExceptions || []).includes(currentModule)));
  const deferS2Sbidders = params['isS2S'] && rule.purpose === 'basicAds' && rule.deferS2Sbidders && !gvlId;
  const {purpose, vendor} = getConsent(consentData, ruleOptions.type, ruleOptions.id, gvlId);
  return (!rule.enforcePurpose || purpose) && (!vendorConsentRequred || deferS2Sbidders || vendor);
}

function gdprRule(purposeNo, checkConsent, blocked = null, gvlidFallback: any = () => null) {
  return function (params) {
    const consentData = gdprDataHandler.getConsentData();
    const modName = params[ACTIVITY_PARAM_COMPONENT_NAME];

    if (shouldEnforce(consentData, purposeNo, modName)) {
      const gvlid = getGvlid(params[ACTIVITY_PARAM_COMPONENT_TYPE], modName, gvlidFallback(params));
      const allow = !!checkConsent(consentData, modName, gvlid, params);
      if (!allow) {
        blocked && blocked.add(modName);
        return {allow};
      }
    }
  };
}

function singlePurposeGdprRule(purposeNo, blocked = null, gvlidFallback: any = () => null) {
  return gdprRule(purposeNo, (cd, modName, gvlid, params) => !!validateRules(ACTIVE_RULES.purpose[purposeNo], cd, modName, gvlid, params), blocked, gvlidFallback);
}

function exceptPrebidModules(ruleFn) {
  return function (params) {
    if (params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE_PREBID) {
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
      if (ACTIVE_RULES.purpose[pno]?.vendorExceptions?.includes(modName)) {
        return true;
      }
      const {purpose, vendor} = getConsent(consentData, 'purpose', pno, gvlId);
      if (purpose && (vendor || ACTIVE_RULES.purpose[pno]?.softVendorExceptions?.includes(modName))) {
        return true;
      }
    }
    return false;
  }

  const defaultBehavior = gdprRule('2-10', check2to10Consent, eidsBlocked);
  const p4Behavior = singlePurposeGdprRule(4, eidsBlocked);
  return function (...args) {
    const fn = ACTIVE_RULES.purpose[4]?.eidsRequireP4Consent ? p4Behavior : defaultBehavior;
    return fn.apply(this, args);
  };
})());

export const transmitPreciseGeoRule = gdprRule('Special Feature 1', (cd, modName, gvlId) => validateRules(ACTIVE_RULES.feature[1], cd, modName, gvlId), geoBlocked);

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
    geoBlocked: formatSet(geoBlocked)
  };

  events.emit(EVENTS.TCF2_ENFORCEMENT, tcf2FinalResults);
  [storageBlocked, biddersBlocked, analyticsBlocked, ufpdBlocked, eidsBlocked, geoBlocked].forEach(el => el.clear());
}

events.on(EVENTS.AUCTION_END, emitTCF2FinalResults);

type TCFControlRule = {
  purpose: keyof typeof CONFIGURABLE_RULES;
  /**
   * Determines whether to enforce the purpose consent.
   */
  enforcePurpose?: boolean;
  /**
   * Determines whether to check vendor signals for this purpose.
   */
  enforceVendor?: boolean;
  /**
   * Defines a list of bidder codes or module names that are exempt from determining legal basis for this Purpose.
   * Note: Prebid.org recommends working with a privacy lawyer before making enforcement exceptions for any vendor.
   */
  vendorExceptions?: string[]
  /**
   * Defines a list of bidder codes or module names that are exempt from the checking vendor signals for this purpose.
   * Unlike with vendorExceptions, Purpose consent is still checked.
   * Note: Prebid.org recommends working with a privacy lawyer before making enforcement exceptions for any vendor.
   */
  softVendorExceptions?: string[]
  /**
   * Only relevant when `purpose` is  `'personalizedAds'`.
   * If true, user IDs and EIDs will not be shared without evidence of consent for TCF Purpose 4.
   * If false (the default), evidence of consent for any of Purposes 2-10 is sufficient for sharing user IDs and EIDs.
   */
  eidsRequireP4Consent?: boolean;
}

declare module '../src/consentHandler' {
  interface ConsentManagementConfig {
    /**
     * If false (the default), allows some use of storage regardless of purpose 1 consent.
     */
    [STRICT_STORAGE_ENFORCEMENT]?: boolean;
  }

}
declare module './consentManagementTcf' {
  interface TCFConfig {
    rules?: TCFControlRule[];
  }
}

/**
 * A configuration function that initializes some module variables, as well as adds hooks
 * @param {Object} config - GDPR enforcement config object
 */
export function setEnforcementConfig(config) {
  let rules: Record<keyof typeof CONFIGURABLE_RULES, TCFControlRule> = deepAccess(config, 'gdpr.rules');
  if (!rules) {
    logWarn('TCF2: enforcing P1 and P2 by default');
  }
  rules = Object.fromEntries((rules as any || []).map(r => [r.purpose, r])) as any;
  strictStorageEnforcement = !!deepAccess(config, STRICT_STORAGE_ENFORCEMENT);

  Object.entries(CONFIGURABLE_RULES).forEach(([name, opts]) => {
    ACTIVE_RULES[opts.type][opts.id] = rules[name] ?? opts.default;
  });

  if (!hooksAdded) {
    if (ACTIVE_RULES.purpose[1] != null) {
      hooksAdded = true;
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_ACCESS_DEVICE, RULE_NAME, accessDeviceRule));
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_SYNC_USER, RULE_NAME, syncUserRule));
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_ENRICH_EIDS, RULE_NAME, enrichEidsRule));
      processRequestOptions.after(checkIfCredentialsAllowed);
    }
    if (ACTIVE_RULES.purpose[2] != null) {
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_FETCH_BIDS, RULE_NAME, fetchBidsRule));
    }
    if (ACTIVE_RULES.purpose[4] != null) {
      RULE_HANDLES.push(
        registerActivityControl(ACTIVITY_TRANSMIT_UFPD, RULE_NAME, ufpdRule),
        registerActivityControl(ACTIVITY_ENRICH_UFPD, RULE_NAME, ufpdRule)
      );
    }
    if (ACTIVE_RULES.purpose[7] != null) {
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_REPORT_ANALYTICS, RULE_NAME, reportAnalyticsRule));
    }
    if (ACTIVE_RULES.feature[1] != null) {
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_TRANSMIT_PRECISE_GEO, RULE_NAME, transmitPreciseGeoRule));
    }
    RULE_HANDLES.push(registerActivityControl(ACTIVITY_TRANSMIT_EIDS, RULE_NAME, transmitEidsRule));
  }
}

export function checkIfCredentialsAllowed(next, options: { withCredentials?: boolean } = {}, moduleType?: string, moduleName?: string) {
  if (!options.withCredentials || (moduleType && moduleName)) {
    next(options);
    return;
  }
  const consentData = gdprDataHandler.getConsentData();
  const rule = ACTIVE_RULES.purpose[1];
  const ruleOptions = CONFIGURABLE_RULES[rule.purpose];
  const {purpose} = getConsent(consentData, ruleOptions.type, ruleOptions.id, null);

  if (!purpose && rule.enforcePurpose) {
    options.withCredentials = false;
    logWarn(`${RULE_NAME} denied ${ACTIVITY_ACCESS_REQUEST_CREDENTIALS}`);
  }
  next(options);
}

export function uninstall() {
  while (RULE_HANDLES.length) RULE_HANDLES.pop()();
  processRequestOptions.getHooks({hook: checkIfCredentialsAllowed}).remove();
  hooksAdded = false;
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
