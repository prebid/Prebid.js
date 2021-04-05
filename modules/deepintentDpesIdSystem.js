/**
 * This module adds DPES to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/deepintentDpesSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'deepintentId';
export const storage = getStorageManager(null, MODULE_NAME);
const DEEPINTENT_DPES_ID = 'di_dpes';

function readCookie(cookieName) {
  // return 1231231;
  const val = storage.cookiesAreEnabled ? storage.getCookie(cookieName) : null;
  return JSON.parse(val);
}

function readFromLocalStorage() {
  const val = storage.localStorageIsEnabled
    ? storage.getDataFromLocalStorage(DEEPINTENT_DPES_ID)
    : null;
  return JSON.parse(val);
}

/** @type {Submodule} */
export const deepintentDpesSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{value:string}} value
   * @returns {{deepintentId:Object}}
   */
  decode(value, config) {
    const configParams = (config && config.params) || {};
    if (configParams && configParams.identityKey && configParams.siteId && value.siteId && configParams.siteId == value.siteId) {
      if (configParams.identityKey === 'hashedEmail') {
        value = {'deepintentId': value.email}
        return value;
      } else if (configParams.identityKey === 'hashedNPI') {
        value = {'deepintentId': value.npi}
        return value;
      }
    }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} config
   * @return {{id: string | undefined} | undefined}
   */
  getId(config) {
    const configStorage = (config && config.storage) || {};

    let id = null;
    if (
      configStorage &&
      Array.isArray(configStorage.identifiersToResolve) &&
      configStorage.identifiersToResolve.length > 0 &&
      configStorage.name &&
      configStorage.type === 'cookie'
    ) {
      id = readCookie(configStorage.name);
    }
    if (configStorage && configStorage.type === 'html5') {
      id = readFromLocalStorage();
    }

    return id ? { id } : undefined;
  },
};

submodule('userId', deepintentDpesSubmodule);
