/**
 * This module adds Open PAIR Id to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/openPairIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js'
import {logInfo} from '../src/utils.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import {VENDORLESS_GVLID} from '../src/consentHandler.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 */

const MODULE_NAME = 'openPairId';
const DEFAULT_PUBLISHER_ID_KEY = 'pairId';

const DEFAULT_STORAGE_PUBLISHER_ID_KEYS = {
  liveramp: '_lr_pairId'
};

const DEFAULT_ATYPE = 3;
const DEFAULT_SOURCE = 'pair-protocol.com';

const MATCH_METHOD = 3;

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

function publisherIdFromLocalStorage(key) {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(key) : null;
}

function publisherIdFromCookie(key) {
  return storage.cookiesAreEnabled() ? storage.getCookie(key) : null;
}

/** @type {Submodule} */
export const openPairIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * used to specify vendor id
   * @type {number}
   */
  gvlid: VENDORLESS_GVLID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { string | undefined } value
   * @returns {{pairId:string} | undefined }
   */
  decode(value) {
    return value && Array.isArray(value) ? {'openPairId': value} : undefined;
  },
  /**
   * Performs action to obtain ID and return a value in the callback's response argument.
   * @function getId
   * @param {Object} config - The configuration object.
   * @param {Object} config.params - The parameters from the configuration.
   * @returns {{id: string[] | undefined}} The obtained IDs or undefined if no IDs are found.
   */
  getId(config) {
    const publisherIdsString = publisherIdFromLocalStorage(DEFAULT_PUBLISHER_ID_KEY) || publisherIdFromCookie(DEFAULT_PUBLISHER_ID_KEY);
    let ids = []

    if (publisherIdsString && typeof publisherIdsString === 'string') {
      try {
        ids = ids.concat(JSON.parse(atob(publisherIdsString)));
      } catch (error) {
        logInfo(error)
      }
    }

    const configParams = (config && config.params) ? config.params : {};
    const cleanRooms = Object.keys(configParams);

    for (let i = 0; i < cleanRooms.length; i++) {
      const cleanRoom = cleanRooms[i];
      const cleanRoomParams = configParams[cleanRoom];

      const cleanRoomStorageLocation = cleanRoomParams.storageKey || DEFAULT_STORAGE_PUBLISHER_ID_KEYS[cleanRoom];
      const cleanRoomValue = publisherIdFromLocalStorage(cleanRoomStorageLocation) || publisherIdFromCookie(cleanRoomStorageLocation);

      if (cleanRoomValue) {
        try {
          const parsedValue = atob(cleanRoomValue);

          if (parsedValue) {
            const obj = JSON.parse(parsedValue);

            if (obj && typeof obj === 'object' && obj.envelope) {
              ids = ids.concat(obj.envelope);
            } else {
              logInfo('Open Pair ID: Parsed object is not valid or does not contain envelope');
            }
          } else {
            logInfo('Open Pair ID: Decoded value is empty');
          }
        } catch (error) {
          logInfo('Open Pair ID: Error parsing JSON: ', error);
        }
      } else {
        logInfo('Open Pair ID: data clean room value for pairId from storage is empty or null');
      }
    }

    if (ids.length === 0) {
      logInfo('Open Pair ID: no ids found')
      return undefined;
    }

    return {'id': ids};
  },
  eids: {
    openPairId: function(values, config = {}) {
      const inserter = config.inserter;
      const matcher = config.matcher;

      const source = DEFAULT_SOURCE;
      const atype = DEFAULT_ATYPE;

      return [
        {
          source: source,
          mm: MATCH_METHOD,
          inserter: inserter,
          matcher: matcher,
          uids: values.map(function(value) {
            return {
              id: value,
              atype: atype
            }
          })
        }
      ];
    }
  },
};

submodule('userId', openPairIdSubmodule);
