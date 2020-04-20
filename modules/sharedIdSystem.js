/**
 * This module adds Shared ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/sharedIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import * as sharedIdGenerator from '../src/sharedIdGenerator.js';

const MODULE_NAME = 'sharedId';
const ID_SVC = 'http://qa.sharedid.org/id';

/**
 * id generation call back
 * @param result
 * @param callback
 * @returns {{success: success, error: error}}
 */
function idGenerationCallback(result, callback) {
  return {
    success: function (responseBody) {
      let responseObj;
      if (responseBody) {
        try {
          responseObj = JSON.parse(responseBody);
          result.id = responseObj.sharedId;
          utils.logInfo('SharedId: Generated SharedId: ' + result.id);
        } catch (error) {
          utils.logError(error);
        }
      }
      callback(result.id);
    },
    error: function (statusText, responseBody) {
      result.id = sharedIdGenerator.id();
      utils.logInfo('SharedId: Ulid Generated SharedId: ' + result.id);
      callback(result.id);
    }
  }
}

/** @type {Submodule} */
export const sharedIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{sharedid:string}} or undefined if value doesn't exists
   */
  decode(value) {
    return (value && typeof value['sharedid'] === 'string') ? { 'sharedid': value['sharedid'] } : undefined;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {sharedId}
   */
  getId(configParams) {
    var result = {
      id: null
    }

    const resp = function (callback) {
      utils.logInfo('sharedId doesnt exists');

      ajax(ID_SVC, idGenerationCallback(result, callback), undefined, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  }
};

// Register submodule for userId
submodule('userId', sharedIdSubmodule);
