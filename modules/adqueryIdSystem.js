/**
 * This module adds Adquery QID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/adqueryIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import { isFn, isStr, isPlainObject, logError } from '../src/utils.js';

const MODULE_NAME = 'qid';
const AU_GVLID = 902;

export const storage = getStorageManager({gvlid: AU_GVLID, moduleName: 'qid'});

/**
 * Param or default.
 * @param {String} param
 * @param {String} defaultVal
 */
function paramOrDefault(param, defaultVal, arg) {
  if (isFn(param)) {
    return param(arg);
  } else if (isStr(param)) {
    return param;
  }
  return defaultVal;
}

/** @type {Submodule} */
export const adqueryIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * IAB TCF Vendor ID
   * @type {string}
   */
  gvlid: AU_GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{value:string}} value
   * @returns {{qid:Object}}
   */
  decode(value) {
    let qid = storage.getDataFromLocalStorage('qid');
    if (isStr(qid)) {
      return {qid: qid};
    }
    return (value && typeof value['qid'] === 'string') ? { 'qid': value['qid'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    if (!isPlainObject(config.params)) {
      config.params = {};
    }
    const url = paramOrDefault(config.params.url,
      `https://bidder.adquery.io/prebid/qid`,
      config.params.urlArg);

    const resp = function (callback) {
      let qid = storage.getDataFromLocalStorage('qid');
      if (isStr(qid)) {
        const responseObj = {qid: qid};
        callback(responseObj);
      } else {
        const callbacks = {
          success: response => {
            let responseObj;
            if (response) {
              try {
                responseObj = JSON.parse(response);
              } catch (error) {
                logError(error);
              }
            }
            callback(responseObj);
          },
          error: error => {
            logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
            callback();
          }
        };
        ajax(url, callbacks, undefined, {method: 'GET'});
      }
    };
    return {callback: resp};
  }
};

submodule('userId', adqueryIdSubmodule);
