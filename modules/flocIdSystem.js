/**
 * This module adds flocId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/flocId
 * @requires module:modules/userId
 */

import { logInfo, logError } from '../src/utils.js';
import {submodule} from '../src/hook.js'

const MODULE_NAME = 'flocId';

/**
 * Add meta tag to support enabling of floc origin trial
 * @function
 * @param {string} token - configured token for origin-trial
 */
function enableOriginTrial(token) {
  const tokenElement = document.createElement('meta');
  tokenElement.httpEquiv = 'origin-trial';
  tokenElement.content = token;
  document.head.appendChild(tokenElement);
}

/**
 * Get the interest cohort.
 * @param successCallback
 * @param errorCallback
 */
function getFlocData(successCallback, errorCallback) {
  errorCallback('The Floc has flown');
}

/**
 * Encode the id
 * @param value
 * @returns {string|*}
 */
function encodeId(value) {
  const result = {};
  if (value) {
    result.flocId = value;
    logInfo('Decoded value ' + JSON.stringify(result));
    return result;
  }
  return undefined;
}

/** @type {Submodule} */
export const flocIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{flocId:{ id: string }} or undefined if value doesn't exists
   */
  decode(value) {
    return (value) ? encodeId(value) : undefined;
  },
  /**
   * If chrome and cohort enabled performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    // Block usage of storage of cohort ID
    const checkStorage = (config && config.storage);
    if (checkStorage) {
      logError('User ID - flocId submodule storage should not defined');
      return;
    }
    // Validate feature is enabled
    const isFlocEnabled = false;

    if (isFlocEnabled) {
      const configParams = (config && config.params) || {};
      if (configParams && (typeof configParams.token === 'string')) {
        // Insert meta-tag with token from configuration
        enableOriginTrial(configParams.token);
      }
      // Example expected output { "id": "14159", "version": "chrome.1.0" }
      let returnCallback = (cb) => {
        getFlocData((data) => {
          returnCallback = () => { return data; }
          logInfo('Cohort id: ' + JSON.stringify(data));
          cb(data);
        }, (err) => {
          logInfo(err);
          cb(undefined);
        });
      };

      return {callback: returnCallback};
    }
  }
};

submodule('userId', flocIdSubmodule);
