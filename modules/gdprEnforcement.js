/**
 * This module gives publishers extra set of features to enforce individual purposes of TCF v2
 */

import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { hasDeviceAccess } from '../src/utils.js';
import adapterManager, { gdprDataHandler } from '../src/adapterManager.js';
import find from 'core-js/library/fn/array/find.js';
import includes from 'core-js/library/fn/array/includes.js';
import { registerSyncInner } from '../src/adapters/bidderFactory.js';
import { getHook } from '../src/hook.js';
import { validateStorageEnforcement } from '../src/storageManager.js';

const purpose1 = 'storage';

let addedDeviceAccessHook = false;
let enforcementRules;

function getGvlid() {
  let gvlid;
  const bidderCode = config.getCurrentBidder();
  if (bidderCode) {
    const bidder = adapterManager.getBidAdapter(bidderCode);
    gvlid = bidder.getSpec().gvlid;
  } else {
    utils.logWarn('Current module not found');
  }
  return gvlid;
}

/**
 * This function takes in rules and consentData as input and validates against the consentData provided. If it returns true Prebid will allow the next call else it will log a warning
 * @param {Object} rules enforcement rules set in config
 * @param {Object} consentData gdpr consent data
 * @returns {boolean}
 */
function validateRules(rule, consentData, currentModule, gvlid) {
  let isAllowed = false;
  if (!rule.vendorExceptions) rule.vendorExceptions = [];
  if (rule.enforcePurpose && rule.enforceVendor) {
    if (
      includes(rule.vendorExceptions, currentModule) ||
      (
        utils.deepAccess(consentData, 'vendorData.purpose.consents.1') === true &&
        utils.deepAccess(consentData, `vendorData.vendor.consents.${gvlid}`) === true
      )
    ) {
      isAllowed = true;
    }
  } else if (rule.enforcePurpose === false && rule.enforceVendor === true) {
    if (
      includes(rule.vendorExceptions, currentModule) ||
      (
        utils.deepAccess(consentData, `vendorData.vendor.consents.${gvlid}`) === true
      )
    ) {
      isAllowed = true;
    }
  } else if (rule.enforcePurpose === false && rule.enforceVendor === false) {
    if (
      !includes(rule.vendorExceptions, currentModule) ||
      (
        (utils.deepAccess(consentData, 'vendorData.purpose.consents.1') === true) &&
        (utils.deepAccess(consentData, `vendorData.vendor.consents.${gvlid}`) === true)
      )
    ) {
      isAllowed = true;
    }
  } else if (rule.enforcePurpose === true && rule.enforceVendor === false) {
    if (
      (utils.deepAccess(consentData, 'vendorData.purpose.consents.1') === true) &&
      (
        !includes(rule.vendorExceptions, currentModule) ||
        (utils.deepAccess(consentData, `vendorData.vendor.consents.${gvlid}`) === true)
      )
    ) {
      isAllowed = true;
    }
  }
  return isAllowed;
}

/**
 * This hook checks whether module has permission to access device or not. Device access include cookie and local storage
 * @param {Function} fn reference to original function (used by hook logic)
 * @param {Number=} gvlid gvlid of the module
 * @param {string=} moduleName name of the module
 */
export function deviceAccessHook(fn, gvlid, moduleName, result) {
  result = Object.assign({}, {
    hasEnforcementHook: true
  });
  if (!hasDeviceAccess()) {
    utils.logWarn('Device access is disabled by Publisher');
    result.valid = false;
    fn.call(this, gvlid, moduleName, result);
  } else {
    const consentData = gdprDataHandler.getConsentData();
    if (consentData && consentData.gdprApplies) {
      if (consentData.apiVersion === 2) {
        if (!gvlid) {
          gvlid = getGvlid();
        }
        const curModule = moduleName || config.getCurrentBidder();
        const purpose1Rule = find(enforcementRules, hasPurpose1);
        let isAllowed = validateRules(purpose1Rule, consentData, curModule, gvlid);
        if (isAllowed) {
          result.valid = true;
          fn.call(this, gvlid, moduleName, result);
        } else {
          utils.logWarn(`User denied Permission for Device access for ${curModule}`);
          result.valid = false;
          fn.call(this, gvlid, moduleName, result);
        }
      } else {
        utils.logInfo('Enforcing TCF2 only');
        result.valid = true;
        fn.call(this, gvlid, moduleName, result);
      }
    } else {
      result.valid = true;
      fn.call(this, gvlid, moduleName, result);
    }
  }
}

/**
 * This hook checks if a bidder has consent for user sync or not
 * @param {Function} fn reference to original function (used by hook logic)
 * @param  {...any} args args
 */
export function userSyncHook(fn, ...args) {
  const consentData = gdprDataHandler.getConsentData();
  if (consentData && consentData.gdprApplies) {
    if (consentData.apiVersion === 2) {
      const gvlid = getGvlid();
      const curBidder = config.getCurrentBidder();
      if (gvlid) {
        const purpose1Rule = find(enforcementRules, hasPurpose1);
        let isAllowed = validateRules(purpose1Rule, consentData, curBidder, gvlid);
        if (isAllowed) {
          fn.call(this, ...args);
        } else {
          utils.logWarn(`User sync not allowed for ${curBidder}`);
        }
      } else {
        utils.logWarn(`User sync not allowed for ${curBidder}`);
      }
    } else {
      utils.logInfo('Enforcing TCF2 only');
      fn.call(this, ...args);
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
  if (consentData && consentData.gdprApplies) {
    if (consentData.apiVersion === 2) {
      let userIdModules = submodules.map((submodule) => {
        const gvlid = submodule.submodule.gvlid;
        const moduleName = submodule.submodule.name;
        if (gvlid) {
          const purpose1Rule = find(enforcementRules, hasPurpose1);
          let isAllowed = validateRules(purpose1Rule, consentData, moduleName, gvlid);
          if (isAllowed) {
            return submodule;
          } else {
            utils.logWarn(`User denied permission to fetch user id for ${moduleName} User id module`);
          }
        } else {
          utils.logWarn(`User denied permission to fetch user id for ${moduleName} User id module`);
        }
        return undefined;
      }).filter(module => module)
      fn.call(this, userIdModules, consentData);
    } else {
      utils.logInfo('Enforcing TCF2 only');
      fn.call(this, submodules, consentData);
    }
  } else {
    fn.call(this, submodules, consentData);
  }
}

const hasPurpose1 = (rule) => { return rule.purpose === purpose1 }

/**
 * A configuration function that initializes some module variables, as well as add hooks
 * @param {Object} config GDPR enforcement config object
 */
export function setEnforcementConfig(config) {
  const rules = utils.deepAccess(config, 'gdpr.rules');
  if (!rules) {
    utils.logWarn('GDPR enforcement rules not defined, exiting enforcement module');
    return;
  }

  enforcementRules = rules;
  const hasDefinedPurpose1 = find(enforcementRules, hasPurpose1);
  if (hasDefinedPurpose1 && !addedDeviceAccessHook) {
    addedDeviceAccessHook = true;
    validateStorageEnforcement.before(deviceAccessHook, 49);
    registerSyncInner.before(userSyncHook, 48);
    // Using getHook as user id and gdprEnforcement are both optional modules. Using import will auto include the file in build
    getHook('validateGdprEnforcement').before(userIdHook, 47);
  }
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
