/**
 * This module gives publishers extra set of features to enforce individual purposes of TCF v2
 */

import { deepAccess, logError, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import adapterManager, { gdprDataHandler } from '../src/adapterManager.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { GDPR_GVLIDS, VENDORLESS_GVLID } from '../src/consentHandler.js';
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
import { registerActivityControl } from '../src/activities/rules.js';
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
// @ts-expect-error the ts compiler is confused by build-time renaming of validate.mjs to validate.js
import { validatePurposeDeclarations } from '../libraries/purposeDeclarations/validate.js';
import type { PurposeDeclarations } from '../libraries/consentManagement/consentUtils.js';
import {
  DEFAULT_PURPOSE_DECLARATION,
  NO_PURPOSE_DECLARATION,
  getConsent,
  setDefaultPurposeDeclaration,
  setGvlLegalBasisMapping,
} from '../libraries/consentManagement/consentUtils.js';

export {
  DEFAULT_PURPOSE_DECLARATION,
  NO_PURPOSE_DECLARATION,
  getAcceptableFlags,
  getPurposeDeclarations,
} from '../libraries/consentManagement/consentUtils.js';
export type { PurposeDeclarations } from '../libraries/consentManagement/consentUtils.js';

export const STRICT_STORAGE_ENFORCEMENT = 'strictStorageEnforcement';

export const ACTIVE_RULES = {
  purpose: {},
  feature: {}
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
declare module '../src/config' {
  interface Config {
    /**
     * Map from module name to that module's GVL ID. This overrides the GVL ID provided
     * by the modules themselves.
     */
    gvlMapping?: { [moduleName: string]: number }
    /**
     * Map from GVL ID to an object describing the legal basis (consent or legitimate interest) that applies to each purpose or feature. This follows the same format as the GVL -
     *  see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20Consent%20string%20and%20vendor%20list%20formats%20v2.md -
     *  and by default is taken from it, for those GVL IDs that are known to Prebid (i.e. declared by adapters, not set through gvlMapping).
     *  When the GVL ID is not known, the default can be configured with `consentManagement.gdpr.defaultLegalBasis`.
     */
    gvlLegalBasisMapping?: { [gvlId: number]: PurposeDeclarations }
  }
}

config.getConfig('gvlLegalBasisMapping', (cfg) => {
  // validate now to give warnings regardless of whether the mapping will actually be used
  const mapping = cfg.gvlLegalBasisMapping ?? {};
  Object.entries(mapping).forEach(([key, value]) => {
    value = Object.assign({}, NO_PURPOSE_DECLARATION, value);
    const errorMessage = validatePurposeDeclarations(value);
    if (errorMessage != null) {
      logWarn(`gvlLegalBasisMapping for GVL ID ${key} is invalid: ${errorMessage}; assuming no legal basis for any purpose`, value);
      value = NO_PURPOSE_DECLARATION;
    }
    mapping[key] = value;
  });
  setGvlLegalBasisMapping(mapping);
});

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
      let { gvlid, modules } = GDPR_GVLIDS.get(moduleName);
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
  const deferToS2S = params['isS2S'] && rule.purpose === 'basicAds' && rule.deferS2Sbidders && !gvlId;
  const useVendorsLegalBasis = !deferToS2S && rule.enforceVendor && !(rule.softVendorExceptions || []).includes(currentModule);
  const { purpose, vendor } = getConsent(consentData, ruleOptions.type, ruleOptions.id, useVendorsLegalBasis ? gvlId : null);
  return (!rule.enforcePurpose || purpose) && (!useVendorsLegalBasis || gvlId === VENDORLESS_GVLID || vendor);
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
        return { allow };
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
export const accessRequestCredentialsRule = singlePurposeGdprRule(1, storageBlocked);

export const transmitEidsRule = exceptPrebidModules((() => {
  // Transmit EID special case:
  // by default, legal basis or vendor exceptions for any purpose between 2 and 10
  // (but disregarding enforcePurpose and enforceVendor config) is enough to allow EIDs through
  function check2to10Consent(consentData, modName, gvlId) {
    for (let pno = 2; pno <= 10; pno++) {
      if (ACTIVE_RULES.purpose[pno]?.vendorExceptions?.includes(modName)) {
        return true;
      }
      const { purpose, vendor } = getConsent(consentData, 'purpose', pno, gvlId);
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
   * If false (the default), evidence of consent for any of Purposes 2-10 is sufficient for sharing user IDs and EIDs.
   */
  eidsRequireP4Consent?: boolean;
  /**
   * Only relevant when `purpose` is 'basicAds'.
   * If true, allows bidders with unknown GVL ID to be included in Prebid Server auctions.
   */
  deferS2Sbidders?: boolean
};

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
    /**
     * Legal basis to use when it cannot be determined from on a vendor's GVL declaration.
     * Normally, Prebid decides whether to accept purpose consent and/or LI transparency based on what the vendor declared
     * in the Global Vendor List, falling back to the `gvlLegalBasisMapping` config. This configuration is used instead when:
     *  - `enforceVendor` is false, or
     *  - the vendor is listed in `softVendorExceptions`, or
     *  - the vendor's declaration is unknown (for example, it has a `gvlMapping` without a corresponding `gvlLegalBasisMapping`)
     *
     *  The default is {purposes: [1,2,4,7], flexiblePurposes: [2], legIntPurposes: [], specialFeatures: [1]}.
     */
    defaultLegalBasis?: PurposeDeclarations
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
    logWarn('TCF2: enforcing P1, P2, P4, P7 and SP1 by default');
  }
  rules = Object.fromEntries((rules as any || []).map(r => [r.purpose, r])) as any;
  strictStorageEnforcement = !!deepAccess(config, STRICT_STORAGE_ENFORCEMENT);
  setDefaultPurposeDeclaration(Object.assign({}, NO_PURPOSE_DECLARATION, config?.gdpr?.defaultLegalBasis ?? DEFAULT_PURPOSE_DECLARATION));

  Object.entries(CONFIGURABLE_RULES).forEach(([name, opts]) => {
    ACTIVE_RULES[opts.type][opts.id] = rules[name] ?? opts.default;
  });

  if (!hooksAdded) {
    if (ACTIVE_RULES.purpose[1] != null) {
      hooksAdded = true;
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_ACCESS_DEVICE, RULE_NAME, accessDeviceRule));
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_SYNC_USER, RULE_NAME, syncUserRule));
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_ENRICH_EIDS, RULE_NAME, enrichEidsRule));
      RULE_HANDLES.push(registerActivityControl(ACTIVITY_ACCESS_REQUEST_CREDENTIALS, RULE_NAME, accessRequestCredentialsRule));
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

export function uninstall() {
  while (RULE_HANDLES.length) RULE_HANDLES.pop()();
  hooksAdded = false;
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
