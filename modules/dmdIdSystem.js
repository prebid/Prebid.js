/**
 * This module adds dmdId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/dmdIdSystem
 * @requires module:modules/userId
 */

import { logError, getWindowLocation } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'dmdId';

/** @type {Submodule} */
export const dmdIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode(value) {
    return value && typeof value === 'string'
      ? { 'dmdId': value }
      : undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData}
   * @param {Object} cacheIdObj - existing id, if any consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    const configParams = (config && config.params) || {};
    if (
      !configParams ||
      !configParams.api_key ||
      typeof configParams.api_key !== 'string'
    ) {
      logError('dmd submodule requires an api_key.');
      return;
    }
    // If cahceIdObj is null or undefined - calling AIX-API
    if (cacheIdObj) {
      return cacheIdObj;
    } else {
      const url = configParams && configParams.api_url
        ? configParams.api_url
        : `https://aix.hcn.health/api/v1/auths`;
      // Setting headers
      const headers = {};
      headers['x-api-key'] = configParams.api_key;
      headers['x-domain'] = getWindowLocation();
      // Response callbacks
      const resp = function (callback) {
        const callbacks = {
          success: response => {
            let responseObj;
            let responseId;
            try {
              responseObj = JSON.parse(response);
              if (responseObj && responseObj.dgid) {
                responseId = responseObj.dgid;
              }
            } catch (error) {
              logError(error);
            }
            callback(responseId);
          },
          error: error => {
            logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
            callback();
          }
        };
        ajax(url, callbacks, undefined, { method: 'GET', withCredentials: true, customHeaders: headers });
      };
      return { callback: resp };
    }
  },
  eids: {
    'dmdId': {
      source: 'hcn.health',
      atype: 3
    },
  }
};

submodule('userId', dmdIdSubmodule);
