/**
 * This module adds PAIR Id to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pairIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js'
import { isStr, logError } from '../src/utils.js';

const MODULE_NAME = 'pairId';
const PAIR_ID_KEY = 'pairId';

export const storage = getStorageManager()

function pairIdFromLocalStorage() {
  return storage.localStorageIsEnabled ? storage.getDataFromLocalStorage(PAIR_ID_KEY) : null;
}

function pairIdFromCookie() {
  return storage.cookiesAreEnabled ? storage.getCookie(PAIR_ID_KEY) : null;
}

/** @type {Submodule} */
export const pairIdSubmodule = {
  /**
  * used to link submodule with config
  * @type {string}
  */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { string | undefined } value
   * @returns {{pairId:string} | undefined }
   */
  decode(value) {
    return value && isStr(value) ? {'pairId': value} : undefined
  },
  /**
  * performs action to obtain id and return a value in the callback's response argument
  * @function
  * @returns {id: string | undefined }
  */
  getId() {
    const pairIdString = pairIdFromLocalStorage() || pairIdFromCookie()

    if (pairIdString && typeof pairIdString == 'string') {
      return { id: pairIdString };
    }

    logError('PairId not found.')
    return undefined;
  }
};

submodule('userId', pairIdSubmodule);
