/**
 * This module adds Utiq MTP provided by Utiq SA/NV to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/utiqMtpIdSystem
 * @requires module:modules/userId
 */
import { logInfo } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { findUtiqService } from "../libraries/utiqUtils/utiqUtils.ts";
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 */

const MODULE_NAME = 'utiqMtpId';
const LOG_PREFIX = 'Utiq MTP module';

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_UID,
  moduleName: MODULE_NAME,
});

/**
 * Get the "mtid" from html5 local storage to make it available to the UserId module.
 * @returns {{utiqMtp: (*|string)}}
 */
function getUtiqFromStorage() {
  let utiqPass;
  const utiqPassStorage = JSON.parse(
    storage.getDataFromLocalStorage('utiqPass')
  );
  logInfo(
    `${LOG_PREFIX}: Local storage utiqPass: ${JSON.stringify(
      utiqPassStorage
    )}`
  );

  if (
    utiqPassStorage &&
    utiqPassStorage.connectId &&
    Array.isArray(utiqPassStorage.connectId.idGraph) &&
    utiqPassStorage.connectId.idGraph.length > 0
  ) {
    utiqPass = utiqPassStorage.connectId.idGraph[0];
  }
  logInfo(
    `${LOG_PREFIX}: Graph of utiqPass: ${JSON.stringify(
      utiqPass
    )}`
  );

  return {
    utiqMtp:
      utiqPass && utiqPass.mtid
        ? utiqPass.mtid
        : null,
  };
}

/** @type {Submodule} */
export const utiqMtpIdSubmodule = {
  /**
   * Used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  disclosureURL: 'local://modules/utiqDeviceStorageDisclosure.json',
  /**
   * Decodes the stored id value for passing to bid requests.
   * @function
   * @returns {{utiqMtp: string} | null}
   */
  decode(bidId) {
    logInfo(`${LOG_PREFIX}: Decoded ID value ${JSON.stringify(bidId)}`);
    return bidId.utiqMtp ? bidId : null;
  },
  /**
   * Get the id from helper function and initiate a new user sync.
   * @param config
   * @returns {{callback: Function}|{id: {utiqMtp: string}}}
   */
  getId: function (config) {
    const data = getUtiqFromStorage();
    if (data.utiqMtp) {
      logInfo(`${LOG_PREFIX}: Local storage ID value ${JSON.stringify(data)}`);
      return { id: { utiqMtp: data.utiqMtp } };
    } else {
      if (!config) {
        config = {};
      }
      if (!config.params) {
        config.params = {};
      }
      if (
        typeof config.params.maxDelayTime === 'undefined' ||
        config.params.maxDelayTime === null
      ) {
        config.params.maxDelayTime = 1000;
      }
      // Current delay and delay step in milliseconds
      let currentDelay = 0;
      const delayStep = 50;
      const result = (callback) => {
        const data = getUtiqFromStorage();
        if (!data.utiqMtp) {
          if (currentDelay > config.params.maxDelayTime) {
            logInfo(
              `${LOG_PREFIX}: No utiq value set after ${config.params.maxDelayTime} max allowed delay time`
            );
            callback(null);
          } else {
            currentDelay += delayStep;
            setTimeout(() => {
              result(callback);
            }, delayStep);
          }
        } else {
          const dataToReturn = { utiqMtp: data.utiqMtp };
          logInfo(
            `${LOG_PREFIX}: Returning ID value data of ${JSON.stringify(
              dataToReturn
            )}`
          );
          callback(dataToReturn);
        }
      };
      return { callback: result };
    }
  },
  eids: {
    'utiqMtp': {
      source: 'utiq-mtp.com',
      atype: 1,
      getValue: function (data) {
        return data;
      },
    },
  }
};

const pbjsGlobal = getGlobal();
const refreshUserIds = pbjsGlobal && typeof pbjsGlobal.refreshUserIds === 'function'
  ? pbjsGlobal.refreshUserIds.bind(pbjsGlobal)
  : () => {};
findUtiqService(storage, refreshUserIds, LOG_PREFIX, MODULE_NAME);
submodule('userId', utiqMtpIdSubmodule);
