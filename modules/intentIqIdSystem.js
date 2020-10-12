/**
 * This module adds IntentIqId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/intentIqIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js'

const MODULE_NAME = 'intentIqId';

const NOT_AVAILABLE = 'NA';

/**
 * Verify the id is valid - Id value or Not Found (ignore not available response)
 * @param id
 * @returns {boolean|*|boolean}
 */
function isValidId(id) {
  return id && id != '' && id != NOT_AVAILABLE && isValidResponse(id);
}

/**
 * Ignore not available response JSON
 * @param obj
 * @returns {boolean}
 */
function isValidResponse(obj) {
  try {
    obj = JSON.parse(obj);
    return obj && obj['RESULT'] != NOT_AVAILABLE;
  } catch (error) {
    utils.logError(error);
    return true;
  }
}

/** @type {Submodule} */
export const intentIqIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{string}} value
   * @returns {{intentIqId: {string}}|undefined}
   */
  decode(value) {
    return isValidId(value) ? { 'intentIqId': value } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.partner !== 'number') {
      utils.logError('User ID - intentIqId submodule requires a valid partner to be defined');
      return;
    }

    // use protocol relative urls for http or https
    let url = `https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=${configParams.partner}&pt=17&dpn=1`;
    url += configParams.pcid ? '&pcid=' + encodeURIComponent(configParams.pcid) : '';
    url += configParams.pai ? '&pai=' + encodeURIComponent(configParams.pai) : '';

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          if (isValidId(response)) {
            callback(response);
          } else {
            callback();
          }
        },
        error: error => {
          utils.logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
          callback();
        }
      };
      ajax(url, callbacks, undefined, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  }
};

submodule('userId', intentIqIdSubmodule);
