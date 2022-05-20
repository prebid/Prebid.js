const SUCCESS = 0;
const FAIL = 1;
const RESULT = 2;

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
