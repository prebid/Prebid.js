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
import events from '../src/events.js';
import { EVENTS } from '../src/constants.json';

const PURPOSE_1 = {
  id: 1,
  name: 'storage'
}

const PURPOSE_2 = {
  id: 2,
  name: 'basicAds'
}

let purpose1Rule;
let purpose2Rule;
let addedDeviceAccessHook = false;
let enforcementRules;

function getGvlid(bidderCode) {
  let gvlid;
  bidderCode = bidderCode || config.getCurrentBidder();
  if (bidderCode) {
    const bidder = adapterManager.getBidAdapter(bidderCode);
    if (bidder && bidder.getSpec) {
      gvlid = bidder.getSpec().gvlid;
    }
  } else {
    utils.logWarn('Current module not found');
  }
  return gvlid;
}

/**
 * This function takes in rules and consentData as input and validates against the consentData provided. If it returns true Prebid will allow the next call else it will log a warning
 * @param {Object} rule - enforcement rules set in config
 * @param {Object} consentData - gdpr consent data
 * @param {number} purpose - Defines which purpose (1, 2, 4, 7) is under check
 * @param {string=} currentModule - Bidder code of the current module
 * @param {number=} gvlid - GVL ID for the module
 * @returns {boolean}
 */
function validateRules(rule, consentData, purpose, currentModule, gvlid) {
  let isAllowed = false;
  if (!rule.vendorExceptions) rule.vendorExceptions = [];
  if (rule.enforcePurpose === true && rule.enforceVendor === true) {
    if (
      includes(rule.vendorExceptions, currentModule) ||
      (
        utils.deepAccess(consentData, `vendorData.purpose.consents.${purpose}`) === true &&
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
        (utils.deepAccess(consentData, `vendorData.purpose.consents.${purpose}`) === true) &&
        (utils.deepAccess(consentData, `vendorData.vendor.consents.${gvlid}`) === true)
      )
    ) {
      isAllowed = true;
    }
  } else if (rule.enforcePurpose === true && rule.enforceVendor === false) {
    if (
      (utils.deepAccess(consentData, `vendorData.purpose.consents.${purpose}`) === true) &&
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
        let isAllowed = validateRules(purpose1Rule, consentData, PURPOSE_1.id, curModule, gvlid);
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
        let isAllowed = validateRules(purpose1Rule, consentData, PURPOSE_1.id, curBidder, gvlid);
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
          let isAllowed = validateRules(purpose1Rule, consentData, PURPOSE_1.id, moduleName, gvlid);
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

/**
 * Checks if the bidder is given consent. If yes, bid adapter is allowed to send ajax request to their endpoint, else, no request
 * is sent. Enforces "purpose 2 (basic ads)" of TCF v2.0 spec
 * @param {Function} fn - Function reference to the original function.
 * @param {Array<adUnits>} adUnits
 */
export function makeBidRequestsHook(fn, adUnits, ...args) {
  const consentData = gdprDataHandler.getConsentData();
  if (consentData && consentData.gdprApplies) {
    if (consentData.apiVersion === 2) {
      const disabledBidders = [];
      adUnits.forEach(adUnit => {
        adUnit.bids = adUnit.bids.filter(bid => {
          const currBidder = bid.bidder;
          const gvlId = getGvlid(currBidder);
          if (includes(disabledBidders, currBidder)) return false;
          const isAllowed = gvlId && validateRules(purpose2Rule, consentData, PURPOSE_2.id, currBidder, gvlId);
          if (!isAllowed) {
            utils.logWarn(`User blocked bidder: ${currBidder}. No bid request will be sent to their endpoint.`);
            events.emit(EVENTS.BIDDER_BLOCKED, currBidder);
            disabledBidders.push(currBidder);
          }
          return isAllowed;
        });
      });
      fn.call(this, adUnits, ...args);
    } else {
      utils.logInfo('Enforcing TCF2 only');
      fn.call(this, adUnits, ...args);
    }
  } else {
    fn.call(this, adUnits, ...args);
  }
}

const hasPurpose1 = (rule) => { return rule.purpose === PURPOSE_1.name }
const hasPurpose2 = (rule) => { return rule.purpose === PURPOSE_2.name }

/**
 * A configuration function that initializes some module variables, as well as add hooks
 * @param {Object} config - GDPR enforcement config object
 */
export function setEnforcementConfig(config) {
  const rules = utils.deepAccess(config, 'gdpr.rules');
  if (!rules) {
    utils.logWarn('GDPR enforcement rules not defined, exiting enforcement module');
    return;
  }

  enforcementRules = rules;
  purpose1Rule = find(enforcementRules, hasPurpose1);
  purpose2Rule = find(enforcementRules, hasPurpose2);

  if (purpose1Rule && !addedDeviceAccessHook) {
    addedDeviceAccessHook = true;
    validateStorageEnforcement.before(deviceAccessHook, 49);
    registerSyncInner.before(userSyncHook, 48);
    // Using getHook as user id and gdprEnforcement are both optional modules. Using import will auto include the file in build
    getHook('validateGdprEnforcement').before(userIdHook, 47);
  }
  if (purpose2Rule) {
    adapterManager.makeBidRequests.before(makeBidRequestsHook);
  }
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
