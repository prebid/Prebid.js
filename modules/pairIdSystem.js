/**
 * This module adds PAIR Id to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pairIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js'
import { logError } from '../src/utils.js';

const MODULE_NAME = 'pairId';
const PAIR_ID_KEY = 'pairId';
const LIVERAMP_PAIR_ID_KEY = '_lr_pairId';

export const storage = getStorageManager()

function pairIdFromLocalStorage(key) {
  return storage.localStorageIsEnabled ? storage.getDataFromLocalStorage(key) : null;
}

function pairIdFromCookie(key) {
  return storage.cookiesAreEnabled ? storage.getCookie(key) : null;
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
    return value && Array.isArray(value) ? {'pairId': value} : undefined
  },
  /**
  * performs action to obtain id and return a value in the callback's response argument
  * @function
  * @returns {id: string | undefined }
  */
  getId(config) {
    const pairIdsString = pairIdFromLocalStorage(PAIR_ID_KEY) || pairIdFromCookie(PAIR_ID_KEY)
    let ids = []
    if (pairIdsString && typeof pairIdsString == 'string') {
      try {
        ids = ids.concat(JSON.parse(atob(pairIdsString)))
      } catch (error) {
        logError(error)
      }
    }

    const configParams = (config && config.params) || {};
    if (configParams && configParams.liveramp) {
      const liverampValue = pairIdFromLocalStorage(LIVERAMP_PAIR_ID_KEY) || pairIdFromCookie(LIVERAMP_PAIR_ID_KEY)
      try {
        const obj = JSON.parse(atob(liverampValue));
        ids = ids.concat(obj.envelope);
      } catch (error) {
        logError(error)
      }
    }

    if (ids.length == 0) {
      logError('PairId not found.')
      return undefined;
    }
    return {'id': ids};
  }
};

submodule('userId', pairIdSubmodule);
