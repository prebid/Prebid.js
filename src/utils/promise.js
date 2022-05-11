const SUCCESS = 0;
const FAIL = 1;
const RESULT = 2;

/**
 * @returns a {promise, resolve, reject} trio where `promise` is resolved by calling `resolve` or `reject`.
 */
export function promiseControls() {
  const status = {};

  function finisher(slot) {
    return function (val) {
      if (status[slot] != null) {
        status[slot](val);
      } else {
        status[slot] = true;
        status[RESULT] = val;
      }
    }
  }

  return {
    promise: new Promise((resolve, reject) => {
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
