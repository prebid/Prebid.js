import {deepClone, delayExecution} from '../../src/utils.js';
import {BidInterceptor} from './bidInterceptor.js';
import {pbsBidInterceptor} from './pbsInterceptor.js';
import {addHooks, removeHooks} from './legacy.js';
import { DEBUG_KEY } from '../../src/constants.json';

const interceptorHooks = [];
let bidInterceptor;
let enabled = false;

function enableDebugging(debugConfig, {fromSession = false, config, hook, logger}) {
  config.setConfig({debug: true});
  bidInterceptor.updateConfig(debugConfig);
  resetHooks(true);
  // also enable "legacy" overrides
  removeHooks({hook});
  addHooks(debugConfig, {hook, logger});
  if (!enabled) {
    enabled = true;
    logger.logMessage(`Debug overrides enabled${fromSession ? ' from session' : ''}`);
  }
}

export function disableDebugging({hook, logger}) {
  bidInterceptor.updateConfig(({}));
  resetHooks(false);
  // also disable "legacy" overrides
  removeHooks({hook});
  if (enabled) {
    enabled = false;
    logger.logMessage('Debug overrides disabled');
  }
}

function saveDebuggingConfig(debugConfig, {sessionStorage = window.sessionStorage} = {}) {
  if (!debugConfig.enabled) {
    try {
      sessionStorage.removeItem(DEBUG_KEY);
    } catch (e) {
    }
  } else {
    if (debugConfig.intercept) {
      debugConfig = deepClone(debugConfig);
      debugConfig.intercept = bidInterceptor.serializeConfig(debugConfig.intercept);
    }
    try {
      sessionStorage.setItem(DEBUG_KEY, JSON.stringify(debugConfig));
    } catch (e) {
    }
  }
}

export function getConfig(debugging, {sessionStorage = window.sessionStorage, config, hook, logger} = {}) {
  if (debugging == null) return;
  saveDebuggingConfig(debugging, {sessionStorage});
  if (!debugging.enabled) {
    disableDebugging({hook, logger});
  } else {
    enableDebugging(debugging, {config, hook, logger});
  }
}

export function sessionLoader({storage, config, hook, logger}) {
  let overrides;
  try {
    storage = storage || window.sessionStorage;
    overrides = JSON.parse(storage.getItem(DEBUG_KEY));
  } catch (e) {
  }
  if (overrides) {
    enableDebugging(overrides, {fromSession: true, config, hook, logger});
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

export function install({config, hook, logger}) {
  bidInterceptor = new BidInterceptor({logger});
  registerBidInterceptor(() => hook.get('processBidderRequests'), bidderBidInterceptor);
  registerBidInterceptor(() => hook.get('processPBSRequest'), pbsBidInterceptor);
  sessionLoader({config, hook, logger});
  config.getConfig('debugging', ({debugging}) => getConfig(debugging, {config, hook, logger}), {init: true});
}
