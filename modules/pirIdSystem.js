/**
 * This module adds pirId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pirId
 * @requires module:modules/userId
 */

import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { getStorageManager } from '../src/storageManager.js';
import { submodule } from '../src/hook.js';

const MODULE_NAME = 'pirId';
const ID_TOKEN = 'pirIdToken';
export const storage = getStorageManager({ moduleName: MODULE_NAME, moduleType: MODULE_TYPE_UID });

/**
 * Reads the ID token from local storage or cookies.
 * @returns {string|undefined} The ID token, or undefined if not found.
 */
export const readId = () => storage.getDataFromLocalStorage(ID_TOKEN) || storage.getCookie(ID_TOKEN);

/** @type {Submodule} */
export const pirIdSubmodule = {
  name: MODULE_NAME,
  gvlid: 676,

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode(value) {
    return typeof value === 'string' ? { 'pirId': value } : undefined;
  },

  /**
   * Sets the ID token in local storage or cookies, if enabled.
   * @param {Object} config The configuration object.
   */
  setId(config) {
    if (typeof config !== 'object' || !config.params || !config.params.pirIdToken) return;

    const { pirIdToken } = config.params;
    const isLSEnabled = storage.localStorageIsEnabled();
    const isCookiesEnabled = storage.cookiesAreEnabled();

    if (isCookiesEnabled) {
      storage.setCookie(ID_TOKEN, pirIdToken, undefined, undefined, 'pir.wp.pl');
    } else if (isLSEnabled) {
      storage.setDataInLocalStorage(ID_TOKEN, pirIdToken);
    }
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    let pirIdToken = readId();

    if (!pirIdToken && config.params && config.params.pirIdToken) {
      pirIdSubmodule.setId(config);

      ({ pirIdToken } = config.params);
    }

    if (pirIdToken) {
      return { id: pirIdToken };
    }
  },
  eids: {
    'pirId': {
      source: 'pir.wp.pl',
      atype: 1
    },
  },
  /**
   * Extracts the top-level domain from the current window's location.
   *
   * @returns {string} The top-level domain of the current window's location.
   */
  domainOverride() {
    const topDomain = window.location.hostname.split('.').slice(-2).join('.');

    return topDomain;
  }
};

submodule('userId', pirIdSubmodule);
