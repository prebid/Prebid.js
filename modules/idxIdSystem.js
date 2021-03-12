/**
 * This module adds IDx to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/idxIdSystem
 * @requires module:modules/userId
 */
import * as utils from '../src/utils.js'
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const IDX_MODULE_NAME = 'idx';
const IDX_COOKIE_NAME = '_idx';
export const storage = getStorageManager();

function readIDxFromCookie() {
  return storage.cookiesAreEnabled ? storage.getCookie(IDX_COOKIE_NAME) : null;
}

function readIDxFromLocalStorage() {
  return storage.localStorageIsEnabled ? storage.getDataFromLocalStorage(IDX_COOKIE_NAME) : null;
}

/** @type {Submodule} */
export const idxIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: IDX_MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { Object | string | undefined } value
   * @return { Object | string | undefined }
   */
  decode(value) {
    const idxVal = value ? utils.isStr(value) ? value : utils.isPlainObject(value) ? value.id : undefined : undefined;
    return idxVal ? {
      'idx': idxVal
    } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} config
   * @return {{id: string | undefined } | undefined}
   */
  getId() {
    const idxString = readIDxFromLocalStorage() || readIDxFromCookie();
    if (typeof idxString == 'string' && idxString) {
      try {
        const idxObj = JSON.parse(idxString);
        return idxObj && idxObj.idx ? { id: idxObj.idx } : undefined;
      } catch (error) {
        utils.logError(error);
      }
    }
    return undefined;
  }
};
submodule('userId', idxIdSubmodule);
