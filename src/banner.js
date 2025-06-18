import { isArrayOfNums, isInteger, isStr, isPlainObject, logWarn } from './utils.js';

/**
 * List of OpenRTB 2.x banner object properties with simple validators.
 * Not included: `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
export const ORTB_BANNER_PARAMS = new Map([
  [ 'format', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'object') ],
  [ 'w', isInteger ],
  [ 'h', isInteger ],
  [ 'btype', isArrayOfNums ],
  [ 'battr', isArrayOfNums ],
  [ 'pos', isInteger ],
  [ 'mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string') ],
  [ 'topframe', value => [1, 0].includes(value) ],
  [ 'expdir', isArrayOfNums ],
  [ 'api', isArrayOfNums ],
  [ 'id', isStr ],
  [ 'vcm', value => [1, 0].includes(value) ]
]);

/**
 * validateOrtbBannerFields mutates the `adUnit.mediaTypes.banner` object by removing invalid ortb properties (default).
 * The onInvalidParam callback can be used to handle invalid properties differently.
 * Other properties are ignored and kept as is.
 *
 * @param {Object} adUnit - The adUnit object.
 * @param {Function} onInvalidParam - The callback function to be called with key, value, and adUnit.
 * @returns {void}
 */
export function validateOrtbBannerFields(adUnit, onInvalidParam) {
  const bannerParams = adUnit?.mediaTypes?.banner;

  if (!isPlainObject(bannerParams)) {
    logWarn(`validateOrtbBannerFields: bannerParams must be an object.`);
    return;
  }

  if (bannerParams != null) {
    Object.entries(bannerParams)
      .forEach(([key, value]) => {
        if (!ORTB_BANNER_PARAMS.has(key)) {
          return
        }
        const isValid = ORTB_BANNER_PARAMS.get(key)(value);
        if (!isValid) {
          if (typeof onInvalidParam === 'function') {
            onInvalidParam(key, value, adUnit);
          } else {
            delete bannerParams[key];
            logWarn(`Invalid prop in adUnit "${adUnit.code}": Invalid value for mediaTypes.banner.${key} ORTB property. The property has been removed.`);
          }
        }
      });
  }
}
