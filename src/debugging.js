
import { config } from 'src/config';
import { logMessage as utilsLogMessage, logWarn as utilsLogWarn } from 'src/utils';
import { addBidResponse } from 'src/auction';

const OVERRIDE_KEY = '$$PREBID_GLOBAL$$:debugging';

export let boundHook;

function logMessage(msg) {
  utilsLogMessage('DEBUG: ' + msg);
}

function logWarn(msg) {
  utilsLogWarn('DEBUG: ' + msg);
}

function enableOverrides(overrides, fromSession = false) {
  config.setConfig({'debug': true});
  logMessage(`bidder overrides enabled${fromSession ? ' from session' : ''}`);

  if (boundHook) {
    addBidResponse.removeHook(boundHook);
  }

  boundHook = addBidResponseHook.bind(null, overrides);
  addBidResponse.addHook(boundHook, 5);
}

export function disableOverrides() {
  if (boundHook) {
    addBidResponse.removeHook(boundHook);
    logMessage('bidder overrides disabled');
  }
}

export function addBidResponseHook(overrides, adUnitCode, bid, next) {
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

export function sessionLoader(storage = window.sessionStorage) {
  let overrides;
  try {
    overrides = JSON.parse(storage.getItem(OVERRIDE_KEY));
  } catch (e) {
  }
  if (overrides) {
    enableOverrides(overrides, true);
  }
}
