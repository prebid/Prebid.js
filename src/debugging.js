
import { config } from './config';
import { logMessage as utilsLogMessage, logWarn as utilsLogWarn } from './utils';
import { addBidRequest, addBidResponse } from './auction';

const OVERRIDE_KEY = '$$PREBID_GLOBAL$$:debugging';

export let boundBidRequestsHook;
export let boundBidResponseHook;

function logMessage(msg) {
  utilsLogMessage('DEBUG: ' + msg);
}

function logWarn(msg) {
  utilsLogWarn('DEBUG: ' + msg);
}

function removeHook() {
  if (boundBidResponseHook) {
    addBidResponse.getHooks({hook: boundBidResponseHook}).remove();
  }
  if (boundBidRequestsHook) {
    addBidRequest.getHooks({hook: boundBidRequestsHook}).remove();
  }
}

function enableOverrides(overrides, fromSession = false) {
  config.setConfig({'debug': true});
  logMessage(`bidder overrides enabled${fromSession ? ' from session' : ''}`);

  removeHook();

  boundBidResponseHook = addBidResponseHook.bind(overrides);
  addBidResponse.before(boundBidResponseHook, 5);

  boundBidRequestsHook = addBidRequestHook.bind(overrides);
  addBidRequest.before(boundBidRequestsHook, 5);
}

export function disableOverrides() {
  removeHook();
  logMessage('bidder overrides disabled');
}

export function addBidResponseHook(next, adUnitCode, bid) {
  let overrides = this;
  if (Array.isArray(overrides.bidders) && overrides.bidders.indexOf(bid.bidderCode) === -1) {
    logWarn(`bidder '${bid.bidderCode}' excluded from auction by bidder overrides`);
    return;
  }

  if (Array.isArray(overrides.bids)) {
    overrides.bids.forEach(overrideBid => {
      if (overrideBid.bidder && overrideBid.bidder !== bid.bidderCode) {
        return;
      }
      if (overrideBid.adUnitCode && overrideBid.adUnitCode !== adUnitCode) {
        return;
      }

      bid = Object.assign({}, bid);

      Object.keys(overrideBid).filter(key => ['bidder', 'adUnitCode'].indexOf(key) === -1).forEach((key) => {
        let value = overrideBid[key];
        logMessage(`bidder overrides changed '${adUnitCode}/${bid.bidderCode}' bid.${key} from '${bid[key]}' to '${value}'`);
        bid[key] = value;
      });
    });
  }

  next(adUnitCode, bid);
}

export function addBidRequestHook(next, bidRequests) {
  const overrides = this;
  if (!Array.isArray(overrides.bidRequests)) {
    next(bidRequests);
    return;
  }

  bidRequests.forEach(bidRequest => {
    if (Array.isArray(overrides.bidders) && overrides.bidders.indexOf(bidRequest.bidderCode) === -1) {
      logWarn(`bidRequest '${bidRequest.bidderCode}' excluded from auction by bidder overrides`);
      return;
    }

    bidRequest.bids.forEach(bid => {
      overrides.bidRequests.forEach(override => {
        if (override.bidder && override.bidder !== bidRequest.bidderCode) {
          return;
        }
        if (override.adUnitCode && override.adUnitCode !== bid.adUnitCode) {
          return;
        }

        Object.keys(override).filter(key => (['adUnitCode', 'bidder'].indexOf(key) === -1)).forEach(key => {
          bid[key] = override[key];
          logMessage(`debug bidRequest override: ${key}=${override[key]}`);
        });
      });
    });
  });

  next(bidRequests);
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
