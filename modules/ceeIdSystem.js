/**
 * This module adds ceeId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/ceeId
 * @requires module:modules/userId
 */

import { logError } from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { getStorageManager } from '../src/storageManager.js';
import { submodule } from '../src/hook.js';
import { domainOverrideToRootDomain } from '../libraries/domainOverrideToRootDomain/index.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'ceeId';
export const storage = getStorageManager({ moduleName: MODULE_NAME, moduleType: MODULE_TYPE_UID });

/**
 * Reads the ID token from local storage or cookies.
 * @returns {string|undefined} The ID token, or undefined if not found.
 */
export const readId = tokenName => storage.getDataFromLocalStorage(tokenName) || storage.getCookie(tokenName);

/**
 * performs fetch to obtain id and return a value
 * @function fetchCeeIdToken
 * @param {Object} requestData The data to be sent in the request body.
 * @returns {Promise<string>} A promise that resolves to the fetched token.
 */
export function fetchCeeIdToken(requestData) {
  return new Promise((resolve, reject) => {
    ajax(
      'https://ceeid.eu/api/token/generate',
      {
        success: (response) => {
          try {
            const responseJson = JSON.parse(response);
            const newCeeIdToken = responseJson.value;
            if (newCeeIdToken) {
              resolve(newCeeIdToken);
            } else {
              logError(`${MODULE_NAME}: No token in response`);
              reject(new Error('No token in response'));
            }
          } catch (error) {
            logError(`${MODULE_NAME}: Server error while fetching ID`, error);
            reject(error);
          }
        },
        error: (error) => {
          logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
          reject(error);
        }
      },
      JSON.stringify(requestData),
      {
        method: 'POST',
        contentType: 'application/json'
      }
    );
  });
}

/** @type {Submodule} */
export const ceeIdSubmodule = {
  name: MODULE_NAME,
  gvlid: 676,

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {string} value
   * @returns {(Object)}
   */
  decode(value) {
    return typeof value === 'string' ? { 'ceeId': value } : undefined;
  },

  /**
   * performs action to obtain id and return a value
   * @function getId
   * @returns {(IdResponse|undefined)}
   */
  getId(config, consentData) {
    const { params = {}, storage = {} } = config;
    const { name: storedCeeIdToken } = storage;
    const { publisherId, type, value, cookieName } = params;
    const { consentString } = consentData;
    const ceeIdToken = readId(storedCeeIdToken) || readId(cookieName);

    if (ceeIdToken) {
      return { id: ceeIdToken };
    }

    if (cookieName) return;

    if (publisherId && type && value && consentString) {
      const requestData = {
        publisherId,
        type,
        value,
        properties: {
          consent: consentString
        },
      };
      const resp = function (callback) {
        fetchCeeIdToken(requestData)
          .then((id) => callback(id));
      };

      return { callback: resp };
    }
  },
  domainOverride: domainOverrideToRootDomain(storage, MODULE_NAME),
  eids: {
    'ceeId': {
      source: 'ceeid.eu',
      atype: 1
    },
  },
};

submodule('userId', ceeIdSubmodule);
