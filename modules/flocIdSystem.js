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
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{flocId:{ id: string }} or undefined if value doesn't exists
   */
  decode(value) {
    return undefined;
  },

  /**
   * If chrome and cohort enabled performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

    if (isChrome && !!document.featurePolicy && !!document.featurePolicy.features() && document.featurePolicy.features().includes('interest-cohort')) {
      const configParams = (config && config.params) || {};
      if (!configParams || (typeof configParams.token !== 'string')) {
        utils.logError('User ID - flocId submodule requires token to be defined');
        return;
      }

      const checkStorage = (config && config.storage) || {};
      if (checkStorage) {
        utils.logError('User ID - flocId submodule requires storage not defined');
        return;
      }

      enableOriginTrial(configParams.token);

      const cohort = document.interestCohort() || {};

      return { id: cohort, ver: window.chrome.version };
    }
  }
};

submodule('userId', flocIdSubmodule);
