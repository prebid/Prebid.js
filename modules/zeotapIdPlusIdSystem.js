/**
 * This module adds Zeotap to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/zeotapIdPlusIdSystem
 * @requires module:modules/userId
 */
import { isStr, isPlainObject } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const ZEOTAP_COOKIE_NAME = 'IDP';
const ZEOTAP_VENDOR_ID = 301;
const ZEOTAP_MODULE_NAME = 'zeotapIdPlus';

function readCookie() {
  return storage.cookiesAreEnabled() ? storage.getCookie(ZEOTAP_COOKIE_NAME) : null;
}

function readFromLocalStorage() {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(ZEOTAP_COOKIE_NAME) : null;
}

export function getStorage() {
  return getStorageManager({gvlid: ZEOTAP_VENDOR_ID, moduleName: ZEOTAP_MODULE_NAME});
}

export const storage = getStorage();

/** @type {Submodule} */
export const zeotapIdPlusSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: ZEOTAP_MODULE_NAME,
  /**
   * Vendor ID of Zeotap
   * @type {Number}
   */
  gvlid: ZEOTAP_VENDOR_ID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { Object | string | undefined } value
   * @return { Object | string | undefined }
   */
  decode(value) {
    const id = value ? isStr(value) ? value : isPlainObject(value) ? value.id : undefined : undefined;
    return id ? {
      'IDP': JSON.parse(atob(id))
    } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} config
   * @return {{id: string | undefined} | undefined}
   */
  getId() {
    const id = readCookie() || readFromLocalStorage();
    return id ? { id } : undefined;
  }
};
submodule('userId', zeotapIdPlusSubmodule);
