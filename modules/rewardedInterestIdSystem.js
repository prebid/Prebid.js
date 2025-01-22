/**
 * This module adds rewarded interest ID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/rewardedInterestIdSystem
 * @requires module:modules/userId
 */

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

/**
 * @typedef RewardedInterestApi
 * @property {getApiVersion} getApiVersion
 * @property {getIdentityToken} getIdentityToken
 */

/**
 * Retrieves the Rewarded Interest API version.
 * @callback getApiVersion
 * @return {string}
 */

/**
 * Retrieves the current identity token.
 * @callback getIdentityToken
 * @return {Promise<string>}
 */

import {submodule} from '../src/hook.js';
import {logError} from '../src/utils.js';

export const MODULE_NAME = 'rewardedInterestId';
export const SOURCE = 'rewardedinterest.com';

/**
 * Get rewarded interest API
 * @function
 * @returns {RewardedInterestApi|undefined}
 */
export function getRewardedInterestApi() {
  if (window.__riApi && window.__riApi.getIdentityToken) {
    return window.__riApi;
  }
}

/**
 * Wait while rewarded interest API to be set and execute the callback function
 * @param {function} callback
 */
export function watchRewardedInterestApi(callback) {
  Object.defineProperties(window, {
    __rewardedInterestApi: {
      value: undefined,
      writable: true
    },
    __riApi: {
      get: () => {
        return window.__rewardedInterestApi;
      },
      set: value => {
        window.__rewardedInterestApi = value;
        callback(value);
      },
      configurable: true,
    }
  });
}

/**
 * Get rewarded interest ID from API and pass it to the callback function
 * @param {RewardedInterestApi} rewardedInterestApi
 * @param {function} callback User ID callbackCompleted
 */
export function getRewardedInterestId(rewardedInterestApi, callback) {
  rewardedInterestApi.getIdentityToken().then(callback).catch(error => {
    callback();
    logError(`${MODULE_NAME} module: ID fetch encountered an error`, error);
  });
}

/**
 * @param {function} callback User ID callbackCompleted
 */
export function apiNotAvailable(callback) {
  callback();
  logError(`${MODULE_NAME} module: Rewarded Interest API not found`);
}

/** @type {Submodule} */
export const rewardedInterestIdSubmodule = {
  /**
   * Used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{rewardedInterestId: string}|undefined}
   */
  decode(value) {
    return value ? {[MODULE_NAME]: value} : undefined;
  },

  /**
   * Performs action to obtain id and return a value in the callback's response argument
   * @function
   * @returns {IdResponse|undefined}
   */
  getId() {
    return {
      callback: cb => {
        const api = getRewardedInterestApi();
        if (api) {
          getRewardedInterestId(api, cb);
        } else if (document.readyState === 'complete') {
          apiNotAvailable(cb);
        } else {
          watchRewardedInterestApi(api => getRewardedInterestId(api, cb));
          // Ensure that cb is called when API is not available
          window.addEventListener('load', () => {
            if (!getRewardedInterestApi()) {
              apiNotAvailable(cb);
            }
          })
        }
      },
    };
  },
  eids: {
    [MODULE_NAME]: {
      source: SOURCE,
      atype: 3,
    },
  },
};

submodule('userId', rewardedInterestIdSubmodule);
