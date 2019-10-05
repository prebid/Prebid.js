
import { config } from './config';
import { logMessage as utilsLogMessage, logWarn as utilsLogWarn } from './utils';
import { addBidResponse, addBidRequest } from './auction';

const OVERRIDE_KEY = '$$PREBID_GLOBAL$$:debugging';

export let boundHook;
export let boundBidRequestsHook;

function logMessage(msg) {
  utilsLogMessage('DEBUG: ' + msg);
}

function logWarn(msg) {
  utilsLogWarn('DEBUG: ' + msg);
}

function removeHook() {
  addBidResponse.getHooks({hook: boundHook}).remove();
  addBidResponse.getHooks({hook: boundBidRequestsHook}).remove();
}

function enableOverrides(overrides, fromSession = false) {
  config.setConfig({'debug': true});
  logMessage(`bidder overrides enabled${fromSession ? ' from session' : ''}`);

  removeHook();

  boundHook = addBidResponseHook.bind(overrides);
  addBidResponse.before(boundHook, 5);

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

export function addBidRequestHook(next, bidRequest) {
  const overrides = this;
  if (Array.isArray(overrides.bidRequests)) {
    overrides.bidRequests.forEach(overrideBidRequest => {
      if (overrideBidRequest.bidderCode && overrideBidRequest.bidderCode !== bidRequest.bidderCode) {
        return;
      }
      if (overrideBidRequest.adUnitCode && overrideBidRequest.adUnitCode !== bidRequest.adUnitCode) {
        return;
      }

      bidRequest = Object.assign({}, bidRequest);

      Object.keys(bidRequest).filter(key => ['bidderCode', 'adUnitCode'].indexOf(key) === -1).forEach(key => {
        bidRequest[key] = bidRequest[key];
        logMessage(`debug bidRequest override: ${key}=${bidRequest[key]}`);
      });
    });
  }

  next(bidRequest);
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
