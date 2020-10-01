/**
 * This module adds Zeotap to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/zeotapIdPlusIdSystem
 * @requires module:modules/userId
 */
import * as utils from '../src/utils.js'
import {submodule} from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const ZEOTAP_COOKIE_NAME = 'IDP';
export const storage = getStorageManager();

function readCookie() {
  return storage.cookiesAreEnabled ? storage.getCookie(ZEOTAP_COOKIE_NAME) : null;
}

function readFromLocalStorage() {
  return storage.localStorageIsEnabled ? storage.getDataFromLocalStorage(ZEOTAP_COOKIE_NAME) : null;
}

/** @type {Submodule} */
export const zeotapIdPlusSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'zeotapIdPlus',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { Object | string | undefined } value
   * @return { Object | string | undefined }
   */
  decode(value) {
    const id = value ? utils.isStr(value) ? value : utils.isPlainObject(value) ? value.id : undefined : undefined;
    return id ? {
      'IDP': JSON.parse(atob(id))
    } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} configParams
   * @return {{id: string | undefined} | undefined}
   */
  getId() {
    const id = readCookie() || readFromLocalStorage();
    return id ? { id } : undefined;
  }
};
submodule('userId', zeotapIdPlusSubmodule);
