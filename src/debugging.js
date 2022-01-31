
import { config } from './config.js';
import { logMessage as utilsLogMessage, logWarn as utilsLogWarn } from './utils.js';
import { addBidderRequests, addBidResponse } from './auction.js';

const OVERRIDE_KEY = '$$PREBID_GLOBAL$$:debugging';

export let addBidResponseBound;
export let addBidderRequestsBound;

function logMessage(msg) {
  utilsLogMessage('DEBUG: ' + msg);
}

function logWarn(msg) {
  utilsLogWarn('DEBUG: ' + msg);
}

function addHooks(overrides) {
  addBidResponseBound = addBidResponseHook.bind(overrides);
  addBidResponse.before(addBidResponseBound, 5);

  addBidderRequestsBound = addBidderRequestsHook.bind(overrides);
  addBidderRequests.before(addBidderRequestsBound, 5);
}

function removeHooks() {
  addBidResponse.getHooks({hook: addBidResponseBound}).remove();
  addBidderRequests.getHooks({hook: addBidderRequestsBound}).remove();
}

export function enableOverrides(overrides, fromSession = false) {
  config.setConfig({'debug': true});
  removeHooks();
  addHooks(overrides);
  logMessage(`bidder overrides enabled${fromSession ? ' from session' : ''}`);
}

export function disableOverrides() {
  removeHooks();
  logMessage('bidder overrides disabled');
}

/**
 * @param {{bidder:string, adUnitCode:string}} overrideObj
 * @param {string} bidderCode
 * @param {string} adUnitCode
 * @returns {boolean}
 */
export function bidExcluded(overrideObj, bidderCode, adUnitCode) {
  if (overrideObj.bidder && overrideObj.bidder !== bidderCode) {
    return true;
  }
  if (overrideObj.adUnitCode && overrideObj.adUnitCode !== adUnitCode) {
    return true;
  }
  return false;
}

/**
 * @param {string[]} bidders
 * @param {string} bidderCode
 * @returns {boolean}
 */
export function bidderExcluded(bidders, bidderCode) {
  return (Array.isArray(bidders) && bidders.indexOf(bidderCode) === -1);
}

/**
 * @param {Object} overrideObj
 * @param {Object} bidObj
 * @param {Object} bidType
 * @returns {Object} bidObj with overridden properties
 */
export function applyBidOverrides(overrideObj, bidObj, bidType) {
  return Object.keys(overrideObj).filter(key => (['adUnitCode', 'bidder'].indexOf(key) === -1)).reduce(function(result, key) {
    logMessage(`bidder overrides changed '${result.adUnitCode}/${result.bidderCode}' ${bidType}.${key} from '${result[key]}.js' to '${overrideObj[key]}'`);
    result[key] = overrideObj[key];
    return result;
  }, bidObj);
}

export function addBidResponseHook(next, adUnitCode, bid) {
  const overrides = this;

  if (bidderExcluded(overrides.bidders, bid.bidderCode)) {
    logWarn(`bidder '${bid.bidderCode}' excluded from auction by bidder overrides`);
    return;
  }

  if (Array.isArray(overrides.bids)) {
    overrides.bids.forEach(function(overrideBid) {
      if (!bidExcluded(overrideBid, bid.bidderCode, adUnitCode)) {
        applyBidOverrides(overrideBid, bid, 'bidder');
      }
    });
  }

  next(adUnitCode, bid);
}

export function addBidderRequestsHook(next, bidderRequests) {
  const overrides = this;

  const includedBidderRequests = bidderRequests.filter(function(bidderRequest) {
    if (bidderExcluded(overrides.bidders, bidderRequest.bidderCode)) {
      logWarn(`bidRequest '${bidderRequest.bidderCode}' excluded from auction by bidder overrides`);
      return false;
    }
    return true;
  });

  if (Array.isArray(overrides.bidRequests)) {
    includedBidderRequests.forEach(function(bidderRequest) {
      overrides.bidRequests.forEach(function(overrideBid) {
        bidderRequest.bids.forEach(function(bid) {
          if (!bidExcluded(overrideBid, bidderRequest.bidderCode, bid.adUnitCode)) {
            applyBidOverrides(overrideBid, bid, 'bidRequest');
          }
        });
      });
    });
  }

  next(includedBidderRequests);
}

export function getConfig(debugging) {
  if (!debugging.enabled) {
    disableOverrides();
    try {
      window.sessionStorage.removeItem(OVERRIDE_KEY);
    } catch (e) {}
  } else {
    try {
      window.sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(debugging));
    } catch (e) {}
    enableOverrides(debugging);
  }
}
config.getConfig('debugging', ({debugging}) => getConfig(debugging));

export function sessionLoader(storage) {
  let overrides;
  try {
    storage = storage || window.sessionStorage;
    overrides = JSON.parse(storage.getItem(OVERRIDE_KEY));
  } catch (e) {
  }
  if (overrides) {
    enableOverrides(overrides, true);
  }
}
