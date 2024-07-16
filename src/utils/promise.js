const SUCCESS = 0;
const FAIL = 1;

export function timeout(delayMs = 0) {
  return new GreedyPromise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export const GreedyPromise = Promise;

/**
 * @returns a {promise, resolve, reject} trio where `promise` is resolved by calling `resolve` or `reject`.
 */
export function defer({promiseFactory = (resolver) => new GreedyPromise(resolver)} = {}) {
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
