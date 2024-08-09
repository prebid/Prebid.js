import {isEmptyStr, isStr, isEmpty} from '../utils.js';
import {GreedyPromise} from '../utils/promise.js';

export const SUA_SOURCE_UNKNOWN = 0;
export const SUA_SOURCE_LOW_ENTROPY = 1;
export const SUA_SOURCE_HIGH_ENTROPY = 2;
export const SUA_SOURCE_UA_HEADER = 3;

// "high entropy" (i.e. privacy-sensitive) fields that can be requested from the navigator.
export const HIGH_ENTROPY_HINTS = [
  'architecture',
  'bitness',
  'model',
  'platformVersion',
  'fullVersionList'
]

export const LOW_ENTROPY_HINTS = [
  'brands',
  'mobile',
  'platform'
]

/**
 * Returns low entropy UA client hints encoded as an ortb2.6 device.sua object; or null if no UA client hints are available.
 */
export const getLowEntropySUA = lowEntropySUAAccessor();

/**
 * Returns a promise to high entropy UA client hints encoded as an ortb2.6 device.sua object, or null if no UA client hints are available.
 *
 * Note that the return value is a promise because the underlying browser API returns a promise; this
 * seems to plan for additional controls (such as alerts / permission request prompts to the user); it's unclear
 * at the moment if this means that asking for more hints would result in slower / more expensive calls.
 *
 * @param {Array[String]} hints hints to request, defaults to all (HIGH_ENTROPY_HINTS).
 */
export const getHighEntropySUA = highEntropySUAAccessor();

export function lowEntropySUAAccessor(uaData = window.navigator?.userAgentData) {
  const sua = (uaData && LOW_ENTROPY_HINTS.some(h => typeof uaData[h] !== 'undefined')) ? Object.freeze(uaDataToSUA(SUA_SOURCE_LOW_ENTROPY, uaData)) : null;
  return function () {
    return sua;
  }
}

export function highEntropySUAAccessor(uaData = window.navigator?.userAgentData) {
  const cache = {};
  const keys = new WeakMap();
  return function (hints = HIGH_ENTROPY_HINTS) {
    if (!keys.has(hints)) {
      const sorted = Array.from(hints);
      sorted.sort();
      keys.set(hints, sorted.join('|'));
    }
    const key = keys.get(hints);
    if (!cache.hasOwnProperty(key)) {
      try {
        cache[key] = uaData.getHighEntropyValues(hints).then(result => {
          return isEmpty(result) ? null : Object.freeze(uaDataToSUA(SUA_SOURCE_HIGH_ENTROPY, result))
        }).catch(() => null);
      } catch (e) {
        cache[key] = GreedyPromise.resolve(null);
      }
    }
    return cache[key];
  }
}

/**
 * Convert a User Agent client hints object to an ORTB 2.6 device.sua fragment
 * https://iabtechlab.com/wp-content/uploads/2022/04/OpenRTB-2-6_FINAL.pdf
 *
 * @param source source of the UAData object (0 to 3)
 * @param uaData https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData/
 * @return {{}}
 */
export function uaDataToSUA(source, uaData) {
  function toBrandVersion(brand, version) {
    const bv = {brand};
    if (isStr(version) && !isEmptyStr(version)) {
      bv.version = version.split('.');
    }
    return bv;
  }

  const sua = {source};
  if (uaData.platform) {
    sua.platform = toBrandVersion(uaData.platform, uaData.platformVersion);
  }
  if (uaData.fullVersionList || uaData.brands) {
    sua.browsers = (uaData.fullVersionList || uaData.brands).map(({brand, version}) => toBrandVersion(brand, version));
  }
  if (typeof uaData['mobile'] !== 'undefined') {
    sua.mobile = uaData.mobile ? 1 : 0;
  }
  ['model', 'bitness', 'architecture'].forEach(prop => {
    const value = uaData[prop];
    if (isStr(value)) {
      sua[prop] = value;
    }
  })
  return sua;
}
