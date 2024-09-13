/**
 * The {@link module:modules/userId} module is required
 * @module modules/yandexIdSystem
 * @requires module:modules/userId
 */

// @ts-check

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 */

import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { logError, logInfo } from '../src/utils.js';

// .com suffix is just a convention for naming the bidder eids
// See https://github.com/prebid/Prebid.js/pull/11196#discussion_r1591165139
export const BIDDER_EID_KEY = 'yandex.com';
export const YANDEX_ID_KEY = 'yandexId';
export const YANDEX_EXT_COOKIE_NAMES = ['_ym_fa'];
export const BIDDER_CODE = 'yandex';
export const YANDEX_USER_ID_KEY = '_ym_uid';
export const YANDEX_COOKIE_STORAGE_TYPE = 'cookie';
export const YANDEX_MIN_EXPIRE_DAYS = 30;

export const PREBID_STORAGE = getStorageManager({
  moduleType: MODULE_TYPE_UID,
  moduleName: BIDDER_CODE,
  bidderCode: undefined
});

/** @type {Submodule} */
export const yandexIdSubmodule = {
  name: BIDDER_CODE,
  /**
   * Decodes the stored id value for passing to bid requests.
   * @param {string} value
   */
  decode(value) {
    logInfo('decoded value yandexId', value);

    return { [YANDEX_ID_KEY]: value };
  },
  getId(submoduleConfig, _consentData, storedId) {
    if (checkConfigHasErrorsAndReport(submoduleConfig)) {
      return;
    }

    if (storedId) {
      return {
        id: storedId
      };
    }

    return {
      id: new YandexUidGenerator().generateUid(),
    };
  },
  eids: {
    [YANDEX_ID_KEY]: {
      source: BIDDER_EID_KEY,
      atype: 1,
      getUidExt() {
        if (PREBID_STORAGE.cookiesAreEnabled()) {
          return YANDEX_EXT_COOKIE_NAMES.reduce((acc, cookieName) => ({
            ...acc,
            [cookieName]: PREBID_STORAGE.getCookie(cookieName),
          }), {});
        }
      },
    },
  },
};

/**
 * @param {SubmoduleConfig} submoduleConfig
 * @returns {boolean} `true` - when there are errors, `false` - otherwise.
 */
function checkConfigHasErrorsAndReport(submoduleConfig) {
  let error = false;

  const READABLE_MODULE_NAME = 'Yandex ID module';

  if (submoduleConfig.storage == null) {
    logError(`Misconfigured ${READABLE_MODULE_NAME}. "storage" is required.`)
    return true;
  }

  if (submoduleConfig.storage?.name !== YANDEX_USER_ID_KEY) {
    logError(`Misconfigured ${READABLE_MODULE_NAME}, "storage.name" is required to be "${YANDEX_USER_ID_KEY}"`);
    error = true;
  }

  if (submoduleConfig.storage?.type !== YANDEX_COOKIE_STORAGE_TYPE) {
    logError(`Misconfigured ${READABLE_MODULE_NAME}, "storage.type" is required to be "${YANDEX_COOKIE_STORAGE_TYPE}"`);
    error = true;
  }

  if ((submoduleConfig.storage?.expires ?? 0) < YANDEX_MIN_EXPIRE_DAYS) {
    logError(`Misconfigured ${READABLE_MODULE_NAME}, "storage.expires" is required to be not less than "${YANDEX_MIN_EXPIRE_DAYS}"`);
    error = true;
  }

  return error;
}

/**
 * Yandex-specific generator for uid. Needs to be compatible with Yandex Metrica tag.
 * @see https://github.com/yandex/metrica-tag/blob/main/src/utils/uid/uid.ts#L51
 */
class YandexUidGenerator {
  /**
   * @param {number} min
   * @param {number} max
   */
  _getRandomInteger(min, max) {
    const generateRandom = this._getRandomGenerator();

    return Math.floor(generateRandom() * (max - min)) + min;
  }

  _getCurrentSecTimestamp() {
    return Math.round(Date.now() / 1000);
  }

  generateUid() {
    return [
      this._getCurrentSecTimestamp(),
      this._getRandomInteger(1000000, 999999999),
    ].join('');
  }

  _getRandomGenerator() {
    if (window.crypto) {
      return () => {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);

        return buffer[0] / 0xffffffff;
      };
    }

    // Polyfill for environments that don't support Crypto API
    return () => Math.random();
  }
}

submodule('userId', yandexIdSubmodule);
