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
    utils.logWarn('Current bidder not found');
  }
  return gvlid;
}

/**
 * This function takes in rules and consentData as input and validates against the consentData provided. If it returns true Prebid will allow the next call else it will log a warning
 * @param {Object} rules
 * @param {Object} consentData
 * @returns {boolean}
 */
function validateRules(rule, consentData, currentModule, gvlid) {
  let isAllowed = false;
  if (rule.enforcePurpose && rule.enforceVendor) {
    if (includes(rule.vendorExceptions, currentModule) ||
        (consentData.vendorData.purpose.consents[1] === true && consentData.vendorData.vendor.consents[gvlid] === true)) {
      isAllowed = true;
    }
  } else if (rule.enforcePurpose === false && rule.enforceVendor === true) {
    if (includes(rule.vendorExceptions, currentModule) ||
        (consentData.vendorData.vendor.consents[gvlid] === true)) {
      isAllowed = true;
    }
  } else if (rule.enforcePurpose === false && rule.enforceVendor === false) {
    if ((includes(rule.vendorExceptions, currentModule) &&
        (consentData.vendorData.purpose.consents[1] === true && consentData.vendorData.vendor.consents[gvlid] === true)) ||
        !includes(rule.vendorExceptions, currentModule)) {
      isAllowed = true;
    }
  }
  return isAllowed;
}

export function deviceAccessHook(fn, gvlid, moduleName) {
  let result = {
    hasEnforcementHook: true
  }
  if (!hasDeviceAccess()) {
    utils.logWarn('Device access is disabled by Publisher');
    result.valid = false;
    return fn.call(this, result);
  }
  const consentData = gdprDataHandler.getConsentData();
  if (consentData && consentData.apiVersion === 2) {
    if (!gvlid) {
      gvlid = getGvlid();
    }
    const curModule = moduleName || config.getCurrentBidder();
    const purpose1Rule = find(enforcementRules, hasPurpose1);
    let isAllowed = validateRules(purpose1Rule, consentData, curModule, gvlid);
    if (isAllowed) {
      result.valid = true;
      return fn.call(this, result);
    } else {
      utils.logWarn(`User denied Permission for Device access for ${curModule}`);
    }
  } else {
    utils.logInfo('TCF enforcement only applies to CMP version 2');
  }
  result.valid = false;
  return fn.call(this, result);
}

export function userSyncHook(fn, ...args) {
  const consentData = gdprDataHandler.getConsentData();
  if (consentData && consentData.apiVersion === 2) {
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
    utils.logInfo('TCF enforcement only applies to CMP version 2');
    fn.call(this, ...args);
  }
}

export function userIdHook(fn, submodules, consentData) {
  if (consentData && consentData.gdprApplies) {
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
    fn.call(this, submodules, consentData);
  }
}

const hasPurpose1 = (rule) => { return rule.purpose === purpose1 }

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
    validateStorageEnforcement.before(deviceAccessHook);
    registerSyncInner.before(userSyncHook);
    // Using getHook as user id and gdprEnforcement are both optional modules. Using import will auto include the file in build
    getHook('validateGdprEnforcement').before(userIdHook);
  }
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
