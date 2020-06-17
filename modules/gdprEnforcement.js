/**
 * This module gives publishers extra set of features to enforce individual purposes of TCF v2
 */

import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { hasDeviceAccess } from '../src/utils.js';
import adapterManager, { gdprDataHandler } from '../src/adapterManager.js';
import find from 'core-js-pure/features/array/find.js';
import includes from 'core-js-pure/features/array/includes.js';
import { registerSyncInner } from '../src/adapters/bidderFactory.js';
import { getHook } from '../src/hook.js';
import { validateStorageEnforcement } from '../src/storageManager.js';
import events from '../src/events.js';
import { EVENTS } from '../src/constants.json';

const TCF2 = {
  'purpose1': { id: 1, name: 'storage' },
  'purpose2': { id: 2, name: 'basicAds' }
}

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
let addedDeviceAccessHook = false;
export let enforcementRules;

function getGvlid(bidderCode) {
  let gvlid;
  bidderCode = bidderCode || config.getCurrentBidder();
  if (bidderCode) {
    const gvlMapping = config.getConfig('gvlMapping');
    if (gvlMapping && gvlMapping[bidderCode]) {
      gvlid = gvlMapping[bidderCode];
    } else {
      const bidder = adapterManager.getBidAdapter(bidderCode);
      if (bidder && bidder.getSpec) {
        gvlid = bidder.getSpec().gvlid;
      }
    }
  }
  return gvlid;
}

function getGvlidForUserIdModule(userIdModule) {
  let gvlId;
  const gvlMapping = config.getConfig('gvlMapping');
  if (gvlMapping && gvlMapping[userIdModule.name]) {
    gvlId = gvlMapping[userIdModule.name];
  } else {
    gvlId = userIdModule.gvlid;
  }
  return gvlId;
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
  if (includes(rule.vendorExceptions || [], currentModule)) {
    return true;
  }

  // get data from the consent string
  const purposeConsent = utils.deepAccess(consentData, `vendorData.purpose.consents.${purposeId}`);
  const vendorConsent = utils.deepAccess(consentData, `vendorData.vendor.consents.${gvlId}`);
  const liTransparency = utils.deepAccess(consentData, `vendorData.purpose.legitimateInterests.${purposeId}`);

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
        const curBidder = config.getCurrentBidder();
        // Bidders have a copy of storage object with bidder code binded. Aliases will also pass the same bidder code when invoking storage functions and hence if alias tries to access device we will try to grab the gvl id for alias instead of original bidder
        if (curBidder && (curBidder != moduleName) && adapterManager.aliasRegistry[curBidder] === moduleName) {
          gvlid = getGvlid(curBidder);
        } else {
          gvlid = getGvlid(moduleName);
        }
        const curModule = moduleName || curBidder;
        let isAllowed = validateRules(purpose1Rule, consentData, curModule, gvlid);
        if (isAllowed) {
          result.valid = true;
          fn.call(this, gvlid, moduleName, result);
        } else {
          curModule && utils.logWarn(`Device access denied for ${curModule} by TCF2`);
          result.valid = false;
          fn.call(this, gvlid, moduleName, result);
        }
      } else {
        // The module doesn't enforce TCF1.1 strings
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
      let isAllowed = validateRules(purpose1Rule, consentData, curBidder, gvlid);
      if (isAllowed) {
        fn.call(this, ...args);
      } else {
        utils.logWarn(`User sync not allowed for ${curBidder}`);
      }
    } else {
      // The module doesn't enforce TCF1.1 strings
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
        const gvlid = getGvlidForUserIdModule(submodule.submodule);
        const moduleName = submodule.submodule.name;
        let isAllowed = validateRules(purpose1Rule, consentData, moduleName, gvlid);
        if (isAllowed) {
          return submodule;
        } else {
          utils.logWarn(`User denied permission to fetch user id for ${moduleName} User id module`);
        }
        return undefined;
      }).filter(module => module)
      fn.call(this, userIdModules, {...consentData, hasValidated: true});
    } else {
      // The module doesn't enforce TCF1.1 strings
      fn.call(this, submodules, consentData);
    }
  } else {
    fn.call(this, submodules, consentData);
  }
}

/**
 * Checks if a bidder is allowed in Auction.
 * Enforces "purpose 2 (basic ads)" of TCF v2.0 spec
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
          const isAllowed = !!validateRules(purpose2Rule, consentData, currBidder, gvlId);
          if (!isAllowed) {
            utils.logWarn(`TCF2 blocked auction for ${currBidder}`);
            events.emit(EVENTS.BIDDER_BLOCKED, currBidder);
            disabledBidders.push(currBidder);
          }
          return isAllowed;
        });
      });
      fn.call(this, adUnits, ...args);
    } else {
      // The module doesn't enforce TCF1.1 strings
      fn.call(this, adUnits, ...args);
    }
  } else {
    fn.call(this, adUnits, ...args);
  }
}

const hasPurpose1 = (rule) => { return rule.purpose === TCF2.purpose1.name }
const hasPurpose2 = (rule) => { return rule.purpose === TCF2.purpose2.name }

/**
 * A configuration function that initializes some module variables, as well as adds hooks
 * @param {Object} config - GDPR enforcement config object
 */
export function setEnforcementConfig(config) {
  const rules = utils.deepAccess(config, 'gdpr.rules');
  if (!rules) {
    utils.logWarn('TCF2: enforcing P1 and P2');
    enforcementRules = DEFAULT_RULES;
  } else {
    enforcementRules = rules;
  }

  purpose1Rule = find(enforcementRules, hasPurpose1);
  purpose2Rule = find(enforcementRules, hasPurpose2);

  if (!purpose1Rule) {
    purpose1Rule = DEFAULT_RULES[0];
  }

  if (!purpose2Rule) {
    purpose2Rule = DEFAULT_RULES[1];
  }

  if (purpose1Rule && !addedDeviceAccessHook) {
    addedDeviceAccessHook = true;
    validateStorageEnforcement.before(deviceAccessHook, 49);
    registerSyncInner.before(userSyncHook, 48);
    // Using getHook as user id and gdprEnforcement are both optional modules. Using import will auto include the file in build
    getHook('validateGdprEnforcement').before(userIdHook, 47);
  }
  if (purpose2Rule) {
    getHook('makeBidRequests').before(makeBidRequestsHook);
  }
}

config.getConfig('consentManagement', config => setEnforcementConfig(config.consentManagement));
