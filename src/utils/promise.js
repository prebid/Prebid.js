const SUCCESS = 0;
const FAIL = 1;
const RESULT = 2;

export class GreedyPromise extends Promise {
  #result;

  static timeout(ms = 0) {
    return new GreedyPromise((resolve) => {
      ms === 0 ? resolve() : setTimeout(resolve, ms);
    });
  }

  constructor(resolver) {
    const result = [];
    function handler(type, resolveFn) {
      return function (value) {
        if (!result.length) {
          result.push(type, value);
          resolveFn(value);
        }
      }
    }
    super((resolve, reject) => {
      const onError = handler(FAIL, reject);
      try {
        resolver(handler(SUCCESS, resolve), onError);
      } catch (e) {
        onError(e);
      }
    });
    this.#result = result;
  }
  then(onSuccess, onError) {
    const result = this.#result;
    return new GreedyPromise((resolve, reject) => {
      const continuation = () => {
        let chain = false;
        let value = result[1];
        let handler, resolveFn;
        if (result[0] === SUCCESS) {
          handler = onSuccess;
          resolveFn = resolve;
        } else {
          handler = onError;
          resolveFn = reject;
        }
        if (typeof handler === 'function') {
          try {
            value = handler(value);
          } catch (e) {
            reject(e);
            return;
          }
          chain = typeof value?.then === 'function';
          resolveFn = resolve;
        }
        chain ? value.then(resolveFn, reject) : resolveFn(value);
      }
      result.length ? continuation() : super.then(continuation, continuation)
    })
  }
}

/**
 * @returns a {promise, resolve, reject} trio where `promise` is resolved by calling `resolve` or `reject`.
 */
export function promiseControls({promiseFactory = (resolver) => new Promise(resolver)} = {}) {
  const status = {};

  function finisher(slot) {
    return function (val) {
      if (typeof status[slot] === 'function') {
        status[slot](val);
      } else if (!status[slot]) {
        status[slot] = true;
        status[RESULT] = val;
      }
    }
  }

  return {
    promise: promiseFactory((resolve, reject) => {
      if (status[SUCCESS] != null) {
        resolve(status[RESULT]);
      } else if (status[FAIL] != null) {
        reject(status[RESULT]);
      } else {
        status[SUCCESS] = resolve;
        status[FAIL] = reject;
      }
    }),
    resolve: finisher(SUCCESS),
    reject: finisher(FAIL)
  }
}
