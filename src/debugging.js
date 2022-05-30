import {config} from './config.js';
import {addBidderRequests, addBidResponse} from './auction.js';
import {hook} from './hook.js';
import {prefixLog} from './utils.js';

const {logWarn, logMessage} = prefixLog('DEBUG:');

const OVERRIDE_KEY = '$$PREBID_GLOBAL$$:debugging';

export let addBidResponseBound;
export let addBidderRequestsBound;

export const onEnableOverrides = [
  (overrides) => {
    removeHooks();
    addHooks(overrides);
  }
];
export const onDisableOverrides = [
  removeHooks
];

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
  onEnableOverrides.forEach((fn) => fn(overrides));
  logMessage(`bidder overrides enabled${fromSession ? ' from session' : ''}`);
}

export function disableOverrides() {
  onDisableOverrides.forEach((fn) => fn());
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
    result.isDebug = true;
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

  const includedBidderRequests = bidderRequests.filter(function (bidderRequest) {
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

export const saveDebuggingConfig = hook('sync', function (debugConfig, {sessionStorage = window.sessionStorage} = {}) {
  if (!debugConfig.enabled) {
    try {
      sessionStorage.removeItem(OVERRIDE_KEY);
    } catch (e) {}
  } else {
    try {
      sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(debugConfig));
    } catch (e) {}
  }
});

export function getConfig(debugging, {sessionStorage = window.sessionStorage} = {}) {
  saveDebuggingConfig(debugging, {sessionStorage});
  if (!debugging.enabled) {
    disableOverrides();
  } else {
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
