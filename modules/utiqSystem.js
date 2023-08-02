/**
 * This module adds Utiq provided by Utiq SA/NV to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/utiqSystem
 * @requires module:modules/userId
 */
import { logInfo } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = 'utiq';
const LOG_PREFIX = 'Utiq module';

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_UID,
  moduleName: MODULE_NAME,
});

/**
 * Get the "atid" from html5 local storage to make it available to the UserId module.
 * @param config
 * @returns {{utiq: (*|string)}}
 */
function getUtiqFromStorage() {
  let utiqPass;
  let utiqPassStorage = JSON.parse(
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
    utiq:
      utiqPass && utiqPass.atid
        ? utiqPass.atid
        : null,
  };
}

/** @type {Submodule} */
export const utiqSubmodule = {
  /**
   * Used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * Decodes the stored id value for passing to bid requests.
   * @function
   * @returns {{utiq: string} | null}
   */
  decode(bidId) {
    logInfo(`${LOG_PREFIX}: Decoded ID value ${JSON.stringify(bidId)}`);
    return bidId.utiq ? bidId : null;
  },
  /**
   * Get the id from helper function and initiate a new user sync.
   * @param config
   * @returns {{callback: result}|{id: {utiq: string}}}
   */
  getId: function (config) {
    const data = getUtiqFromStorage();
    if (data.utiq) {
      logInfo(`${LOG_PREFIX}: Local storage ID value ${JSON.stringify(data)}`);
      return { id: { utiq: data.utiq } };
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
        if (!data.utiq) {
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
          const dataToReturn = { utiq: data.utiq };
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
};

submodule('userId', utiqSubmodule);
