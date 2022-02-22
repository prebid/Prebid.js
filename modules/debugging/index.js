import {deepClone, delayExecution, prefixLog} from '../../src/utils.js';
import {processBidderRequests} from '../../src/adapters/bidderFactory.js';
import {BidInterceptor} from './bidInterceptor.js';
import {hook} from '../../src/hook.js';
import {pbsBidInterceptor} from './pbsInterceptor.js';
import {addHooks, removeHooks} from './legacy.js';
import {config} from '../../src/config.js';
import {OVERRIDE_KEY} from '../../src/debugging.js';

const {logMessage} = prefixLog('DEBUG:');

const interceptorHooks = [];
const bidInterceptor = new BidInterceptor();

function enableDebugging(debugConfig, fromSession = false) {
  config.setConfig({debug: true});
  bidInterceptor.updateConfig(debugConfig);
  resetHooks(true);
  // also enable "legacy" overrides
  removeHooks();
  addHooks(debugConfig);
  logMessage(`Debug overrides enabled${fromSession ? ' from session' : ''}`);
}

export function disableDebugging() {
  bidInterceptor.updateConfig(({}));
  resetHooks(false);
  // also disable "legacy" overrides
  removeHooks();
  logMessage('Debug overrides disabled');
}

function saveDebuggingConfig(debugConfig, {sessionStorage = window.sessionStorage} = {}) {
  if (!debugConfig.enabled) {
    try {
      sessionStorage.removeItem(OVERRIDE_KEY);
    } catch (e) {
    }
  } else {
    if (debugConfig.intercept) {
      debugConfig = deepClone(debugConfig);
      debugConfig.intercept = bidInterceptor.serializeConfig(debugConfig.intercept);
    }
    try {
      sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(debugConfig));
    } catch (e) {
    }
  }
}

export function getConfig(debugging, {sessionStorage = window.sessionStorage} = {}) {
  saveDebuggingConfig(debugging, {sessionStorage});
  if (!debugging.enabled) {
    disableDebugging();
  } else {
    enableDebugging(debugging);
  }
}

export function sessionLoader(storage) {
  let overrides;
  try {
    storage = storage || window.sessionStorage;
    overrides = JSON.parse(storage.getItem(OVERRIDE_KEY));
  } catch (e) {
  }
  if (overrides) {
    enableDebugging(overrides, true);
  }
}

function resetHooks(enable) {
  interceptorHooks.forEach(([getHookFn, interceptor]) => {
    getHookFn().getHooks({hook: interceptor}).remove();
  });
  if (enable) {
    interceptorHooks.forEach(([getHookFn, interceptor]) => {
      getHookFn().before(interceptor);
    });
  }
}

function registerBidInterceptor(getHookFn, interceptor) {
  const interceptBids = (...args) => bidInterceptor.intercept(...args);
  interceptorHooks.push([getHookFn, function (next, ...args) {
    interceptor(next, interceptBids, ...args);
  }]);
}

export function bidderBidInterceptor(next, interceptBids, spec, bids, bidRequest, ajax, wrapCallback, cbs) {
  const done = delayExecution(cbs.onCompletion, 2);
  ({bids, bidRequest} = interceptBids({bids, bidRequest, addBid: cbs.onBid, done}));
  if (bids.length === 0) {
    done();
  } else {
    next(spec, bids, bidRequest, ajax, wrapCallback, {...cbs, onCompletion: done});
  }
}

registerBidInterceptor(() => processBidderRequests, bidderBidInterceptor);
registerBidInterceptor(() => hook.get('processPBSRequest'), pbsBidInterceptor);

config.getConfig('debugging', ({debugging}) => getConfig(debugging));
sessionLoader();
