/**
 * This module adds PAIR Id to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pairIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js'
import { logInfo } from '../src/utils.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 */

const MODULE_NAME = 'pairId';
const PAIR_ID_KEY = 'pairId';
const DEFAULT_LIVERAMP_PAIR_ID_KEY = '_lr_pairId';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

function pairIdFromLocalStorage(key) {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(key) : null;
}

function pairIdFromCookie(key) {
  return storage.cookiesAreEnabled() ? storage.getCookie(key) : null;
}

/** @type {Submodule} */
export const pairIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * used to specify vendor id
   * @type {number}
   */
  gvlid: 755,
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
        logInfo(error)
      }
    }

    const configParams = (config && config.params) || {};
    if (configParams && configParams.liveramp) {
      let LRStorageLocation = configParams.liveramp.storageKey || DEFAULT_LIVERAMP_PAIR_ID_KEY
      const liverampValue = pairIdFromLocalStorage(LRStorageLocation) || pairIdFromCookie(LRStorageLocation)
      try {
        const obj = JSON.parse(atob(liverampValue));
        ids = ids.concat(obj.envelope);
      } catch (error) {
        logInfo(error)
      }
    }

    if (ids.length == 0) {
      logInfo('PairId not found.')
      return undefined;
    }
    return {'id': ids};
  },
  eids: {
    'pairId': {
      source: 'google.com',
      atype: 571187
    },
  }
};

submodule('userId', pairIdSubmodule);
