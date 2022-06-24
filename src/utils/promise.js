const SUCCESS = 0;
const FAIL = 1;
const RESULT = 2;
const NONE = {}
const GREEDY = new WeakSet();

/**
 * @returns {Promise}
 */
export function greedyPromise(resolver) {
  let result = NONE;
  let isError = false;
  const callbacks = [];

  function runCallbacks() {
    while (callbacks.length > 0) {
      callbacks.pop()()
    }
  }

  try {
    resolver(
      (value) => {
        if (result === NONE) {
          result = value;
          runCallbacks();
        }
      },
      (error) => {
        if (result === NONE) {
          result = error;
          isError = true;
          runCallbacks();
        }
      }
    )
  } catch (e) {
    result = e;
    isError = true;
  }

  function then(onSuccess, onError) {
    return greedyPromise((resolve, reject) => {
      function continuation() {
        let value = result;
        let fn = isError ? reject : resolve;
        try {
          if (isError && typeof onError === 'function') {
            value = onError(value);
            fn = resolve;
          } else if (!isError && typeof onSuccess === 'function') {
            value = onSuccess(value);
          }
        } catch (e) {
          reject(e);
          return;
        }
        greedyPromise.resolve(value).then(fn, reject);
      }

      result === NONE ? callbacks.push(continuation) : continuation();
    })
  }

  const promise = {
    then,
    catch(onError) {
      return then(null, onError)
    },
    finally(onFinally) {
      function runFn(transform = (v) => v) {
        return value => greedyPromise.resolve(onFinally()).then(() => transform(value))
      }
      return then(runFn(), runFn(greedyPromise.reject));
    }
  };
  GREEDY.add(promise);
  return promise;
}

Object.assign(greedyPromise, {
  resolve(value) {
    if (GREEDY.has(value)) return value;
    return greedyPromise(
      typeof value?.then === 'function'
        ? (resolve, reject) => value.then(resolve, reject)
        : (resolve) => resolve(value)
    );
  },
  reject(value) {
    return greedyPromise((_, reject) => reject(value));
  },
  allSettled(promises) {
    return greedyPromise((resolve) => {
      const result = new Array(promises.length);
      collect(
        promises,
        (value, i) => { result[i] = {status: 'fulfilled', value} },
        (reason, i) => { result[i] = {status: 'rejected', reason} },
        () => resolve(result)
      );
    })
  },
  all(promises) {
    return greedyPromise((resolve, reject) => {
      const result = new Array(promises.length);
      collect(
        promises,
        (value, i) => result[i] = value,
        (error, i, stop) => { stop(); reject(error) },
        () => resolve(result)
      );
    })
  },
  race(promises) {
    return greedyPromise((resolve, reject) => {
      collect(
        promises,
        (value, i, stop) => { stop(); resolve(value) },
        (error, i, stop) => { stop(); reject(error) }
      )
    })
  },
  delay(ms = 0) {
    return greedyPromise((resolve) => {
      if (ms === 0) {
        resolve()
      } else {
        setTimeout(() => resolve(), ms)
      }
    })
  }
})

function collect(promises, onSuccess, onError, done) {
  let pending = promises.length;
  let active = true;
  function handler(i, cb) {
    return function (value) {
      if (active) {
        cb(value, i, () => { active = false });
        pending--;
        if (active && pending === 0) {
          done();
        }
      }
    }
  }
  promises.forEach((promise, i) => {
    if (active) {
      greedyPromise.resolve(promise).then(handler(i, onSuccess), handler(i, onError));
    }
  })
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
