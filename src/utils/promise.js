
export function delay(delayMs = 0, P = GreedyPromise) {
  return new P((resolve) => {
    delayMs > 0 ? setTimeout(resolve, delayMs) : resolve();
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
