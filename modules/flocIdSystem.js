/**
 * This module adds flocId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/flocId
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {submodule} from '../src/hook.js'

const MODULE_NAME = 'originFloc';

/**
 * Add meta tag to support enabling of floc origin trial
 * @function
 * @param {string} token - configured token for origin-trial
 */
function enableOriginTrial(token) {
  const tokenElement = document.createElement('meta')
  tokenElement.httpEquiv = 'origin-trial'
  tokenElement.content = token
  document.head.appendChild(tokenElement)
}

/** @type {Submodule} */
export const flocIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * If chrome and cohort enabled performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

    // Validate feature is enabled
    const isFlocEnabled = !!document.featurePolicy && !!document.featurePolicy.features() && document.featurePolicy.features().includes('interest-cohort');

    if (isChrome && isFlocEnabled) {
      const configParams = (config && config.params) || {};
      if (!configParams || (typeof configParams.token !== 'string')) {
        utils.logError('User ID - flocId submodule requires token to be defined');
        return;
      }

      // Block usage of storage of cohort ID
      const checkStorage = (config && config.storage) || {};
      if (checkStorage) {
        utils.logError('User ID - flocId submodule requires storage not defined');
        return;
      }

      // Insert meta-tag with token from configuration
      enableOriginTrial(configParams.token);

      // Example expected output { "id": "14159", "version": "chrome.1.0" }
      return document.interestCohort() || {};
    }
  }
};

submodule('userId', flocIdSubmodule);
