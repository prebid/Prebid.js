const SUCCESS = 0;
const FAIL = 1;

/**
 * A version of Promise that runs callbacks synchronously when it can (i.e. after it's been fulfilled or rejected).
 */
export class GreedyPromise extends Promise {
  #result;
  #callbacks;

  /**
   * Convenience wrapper for setTimeout; takes care of returning an already fulfilled GreedyPromise when the delay is zero.
   *
   * @param {Number} delayMs delay in milliseconds
   * @returns {GreedyPromise} a promise that resolves (to undefined) in `delayMs` milliseconds
   */
  static timeout(delayMs = 0) {
    return new GreedyPromise((resolve) => {
      delayMs === 0 ? resolve() : setTimeout(resolve, delayMs);
    });
  }

  constructor(resolver) {
    const result = [];
    const callbacks = [];
    function handler(type, resolveFn) {
      return function (value) {
        if (!result.length) {
          result.push(type, value);
          while (callbacks.length) callbacks.shift()();
          resolveFn(value);
        }
      }
    }
    super(
      typeof resolver !== 'function'
        ? resolver // let super throw an error
        : (resolve, reject) => {
          const rejectHandler = handler(FAIL, reject);
          const resolveHandler = (() => {
            const done = handler(SUCCESS, resolve);
            return value =>
              typeof value?.then === 'function' ? value.then(done, rejectHandler) : done(value);
          })();
          try {
            resolver(resolveHandler, rejectHandler);
          } catch (e) {
            rejectHandler(e);
          }
        }
    );
    this.#result = result;
    this.#callbacks = callbacks;
  }
  then(onSuccess, onError) {
    const result = this.#result;
    return new GreedyPromise((resolve, reject) => {
      const continuation = () => {
        let value = result[1];
        let [handler, resolveFn] = result[0] === SUCCESS ? [onSuccess, resolve] : [onError, reject];
        if (typeof handler === 'function') {
          try {
            value = handler(value);
          } catch (e) {
            reject(e);
            return;
          }
          resolveFn = resolve;
        }
        resolveFn(value);
      }
      result.length ? continuation() : this.#callbacks.push(continuation);
    })
  }
}

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
