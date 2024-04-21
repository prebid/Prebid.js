/**
 * The {@link module:modules/userId} module is required
 * @module modules/yandexIdSystem
 * @requires module:modules/userId
 */

import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { logInfo } from '../src/utils.js';

const BIDDER_CODE = 'yandex';
const YANDEX_ID_KEY = 'yandexId';

const USER_ID_KEY = '_ym_uid';
const USER_ID_COOKIE_EXP_MS = 31536000000; // 365 days

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_UID,
  moduleName: BIDDER_CODE,
});

export const yandexIdSubmodule = {
  /**
   * Used to link submodule with config.
   * @type {string}
   */
  name: BIDDER_CODE,
  /**
   * Decodes the stored id value for passing to bid requests.
   * @param {string} value
   */
  decode(value) {
    logInfo('decoded value yandexId', value);

    return { [YANDEX_ID_KEY]: value };
  },
  getId() {
    const yandexUidStorage = new YandexUidStorage(storage);

    if (!yandexUidStorage.checkIsAvailable()) {
      return;
    }

    return {
      id: yandexUidStorage.getUid(),
    };
  },
  eids: {
    [YANDEX_ID_KEY]: {
      source: BIDDER_CODE,
      atype: 1,
    },
  },
};

class YandexUidStorage {
  /**
   * @param {typeof cookieStorage} cookieStorage
   */
  constructor(cookieStorage) {
    this._cookieStorage = cookieStorage;
  }

  _generateUid() {
    return new YandexUidGenerator().generateUid();
  }

  _getUserIdFromStorage() {
    const id = this._cookieStorage.getCookie(USER_ID_KEY);

    return id;
  }

  _setUid(userId) {
    if (this._cookieStorage.cookiesAreEnabled()) {
      const expires = new Date(Date.now() + USER_ID_COOKIE_EXP_MS).toString();

      this._cookieStorage.setCookie(USER_ID_KEY, userId, expires);
    }
  }

  checkIsAvailable() {
    return this._cookieStorage.cookiesAreEnabled();
  }

  getUid() {
    const id = this._getUserIdFromStorage() || this._generateUid();

    this._setUid(id);

    return id;
  }
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
    if (crypto) {
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
