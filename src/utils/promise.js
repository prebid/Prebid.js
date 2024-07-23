import {GreedyPromise} from '../../libraries/greedy/greedyPromise.js';
import {getGlobal} from '../prebidGlobal.js';

export const PbPromise = getGlobal().Promise ?? (FEATURES.GREEDY ? GreedyPromise : Promise);

export function delay(delayMs = 0, P = PbPromise) {
  return new P((resolve) => {
    delayMs > 0 ? setTimeout(resolve, delayMs) : resolve();
  });
}

/**
 * @returns a {promise, resolve, reject} trio where `promise` is resolved by calling `resolve` or `reject`.
 */
export function defer({promiseFactory = (resolver) => new PbPromise(resolver)} = {}) {
  function invoker(delegate) {
    return (val) => delegate(val);
  }

  let resolveFn, rejectFn;

  return {
    promise: promiseFactory((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    }),
    resolve: invoker(resolveFn),
    reject: invoker(rejectFn)
  }
}
