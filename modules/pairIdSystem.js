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

const DEFAULT_STORAGE_PAID_ID_KEYS = {
  liveramp: '_lr_pairId'
};

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
   * decode the stored id value for passing to bid requests
   * @function
   * @param { string | undefined } value
   * @returns {{pairId:string} | undefined }
   */
  decode(value) {
    return value && Array.isArray(value) ? {'pairId': value} : undefined
  },
  /**
   * Performs action to obtain ID and return a value in the callback's response argument.
   * @function getId
   * @param {Object} config - The configuration object.
   * @param {Object} config.params - The parameters from the configuration.
   * @returns {{id: string[] | undefined}} The obtained IDs or undefined if no IDs are found.
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
    const cleanRooms = Object.keys(configParams);

    for (let i = 0; i < cleanRooms.length; i++) {
      const cleanRoom = cleanRooms[i];
      const cleanRoomParams = cleanRoom[i];

      const cleanRoomStorageLocation = cleanRoomParams.storageKey || DEFAULT_STORAGE_PAID_ID_KEYS[cleanRoom];
      const cleanRoomValue = pairIdFromLocalStorage(cleanRoomStorageLocation) || pairIdFromCookie(cleanRoomStorageLocation);

      if (cleanRoomValue) {
        try {
          const parsedValue = atob(cleanRoomValue);

          if (parsedValue) {
            const obj = JSON.parse(parsedValue);

            if (obj && typeof obj === 'object' && obj.envelope) {
              ids = ids.concat(obj.envelope);
            } else {
              logInfo('Pairid: Parsed object is not valid or does not contain envelope');
            }
          } else {
            logInfo('Pairid: Decoded value is empty');
          }
        } catch (error) {
          logInfo('Pairid: Error parsing JSON: ', error);
        }
      } else {
        logInfo('Pairid: data clean room value for pairId from storage is empty or null');
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
      source: 'iabtechlab.com',
      atype: 571187
    },
  }
};

submodule('userId', pairIdSubmodule);
