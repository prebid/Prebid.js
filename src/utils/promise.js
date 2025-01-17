const SUCCESS = 0;
const FAIL = 1;

/**
 * A version of Promise that runs callbacks synchronously when it can (i.e. after it's been fulfilled or rejected).
 */
export class GreedyPromise {
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
    if (typeof resolver !== 'function') {
      throw new Error('resolver not a function');
    }
    const result = [];
    const callbacks = [];
    let [resolve, reject] = [SUCCESS, FAIL].map((type) => {
      return function (value) {
        if (type === SUCCESS && typeof value?.then === 'function') {
          value.then(resolve, reject);
        } else if (!result.length) {
          result.push(type, value);
          while (callbacks.length) callbacks.shift()();
        }
      }
    });
    try {
      resolver(resolve, reject);
    } catch (e) {
      reject(e);
    }
    this.#result = result;
    this.#callbacks = callbacks;
  }

  then(onSuccess, onError) {
    const result = this.#result;
    return new this.constructor((resolve, reject) => {
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
    });
  }

  catch(onError) {
    return this.then(null, onError);
  }

  finally(onFinally) {
    let val;
    return this.then(
      (v) => { val = v; return onFinally(); },
      (e) => { val = this.constructor.reject(e); return onFinally() }
    ).then(() => val);
  }

  static #collect(promises, collector, done) {
    let cnt = promises.length;
    function clt() {
      collector.apply(this, arguments);
      if (--cnt <= 0 && done) done();
    }
    promises.length === 0 && done ? done() : promises.forEach((p, i) => this.resolve(p).then(
      (val) => clt(true, val, i),
      (err) => clt(false, err, i)
    ));
  }

  static race(promises) {
    return new this((resolve, reject) => {
      this.#collect(promises, (success, result) => success ? resolve(result) : reject(result));
    })
  }

  static all(promises) {
    return new this((resolve, reject) => {
      let res = [];
      this.#collect(promises, (success, val, i) => success ? res[i] = val : reject(val), () => resolve(res));
    })
  }

  static allSettled(promises) {
    return new this((resolve) => {
      let res = [];
      this.#collect(promises, (success, val, i) => res[i] = success ? {status: 'fulfilled', value: val} : {status: 'rejected', reason: val}, () => resolve(res))
    })
  }

  static resolve(value) {
    return new this(resolve => resolve(value))
  }

  static reject(error) {
    return new this((resolve, reject) => reject(error))
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
