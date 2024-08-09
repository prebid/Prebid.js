import {deepClone, delayExecution} from '../../src/utils.js';
import {processBidderRequests} from '../../src/adapters/bidderFactory.js';
import {BidInterceptor} from './bidInterceptor.js';
import {hook} from '../../src/hook.js';
import {pbsBidInterceptor} from './pbsInterceptor.js';
import {
  onDisableOverrides,
  onEnableOverrides,
  saveDebuggingConfig
} from '../../src/debugging.js';

const interceptorHooks = [];
const bidInterceptor = new BidInterceptor();

saveDebuggingConfig.before(function (next, debugConfig, ...args) {
  if (debugConfig.intercept) {
    debugConfig = deepClone(debugConfig);
    debugConfig.intercept = bidInterceptor.serializeConfig(debugConfig.intercept);
  }
  next(debugConfig, ...args);
});

function resetHooks(enable) {
  interceptorHooks.forEach(([getHookFn, interceptor]) => {
    getHookFn().getHooks({hook: interceptor}).remove();
  });
  if (enable) {
    interceptorHooks.forEach(([getHookFn, interceptor]) => {
      getHookFn().before(interceptor);
    })
  }
}

onEnableOverrides.push((overrides) => {
  bidInterceptor.updateConfig(overrides);
  resetHooks(true);
});

onDisableOverrides.push(() => {
  bidInterceptor.updateConfig({});
  resetHooks(false);
})

function registerBidInterceptor(getHookFn, interceptor) {
  const interceptBids = (...args) => bidInterceptor.intercept(...args);
  interceptorHooks.push([getHookFn, function (next, ...args) {
    interceptor(next, interceptBids, ...args)
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
