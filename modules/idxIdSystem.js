/**
 * This module adds IDx to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/idxIdSystem
 * @requires module:modules/userId
 */
import { isStr, isPlainObject, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 */

const IDX_MODULE_NAME = 'idx';
const IDX_COOKIE_NAME = '_idx';
export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: IDX_MODULE_NAME});

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
    const idxVal = value ? isStr(value) ? value : isPlainObject(value) ? value.id : undefined : undefined;
    return idxVal ? {
      'idx': idxVal
    } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @return {{id: string | undefined } | undefined}
   */
  getId() {
    const idxString = readIDxFromLocalStorage() || readIDxFromCookie();
    if (typeof idxString === 'string' && idxString) {
      try {
        const idxObj = JSON.parse(idxString);
        return idxObj && idxObj.idx ? { id: idxObj.idx } : undefined;
      } catch (error) {
        logError(error);
      }
    }
    return undefined;
  },
  eids: {
    'idx': {
      source: 'idx.lat',
      atype: 1
    },
  }
};
submodule('userId', idxIdSubmodule);
