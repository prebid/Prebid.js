/**
 * This module adds Adquery QID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/adqueryIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isFn, isPlainObject, isStr, logError, logInfo, logMessage} from '../src/utils.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'qid';
const AU_GVLID = 902;

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: 'qid'});

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
    return {qid: value}
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    logMessage('adqueryIdSubmodule getId');

    let qid = storage.getDataFromLocalStorage('qid');

    if (qid) {
      return {
        callback: function (callback) {
          callback(qid);
        }
      }
    }

    if (!isPlainObject(config.params)) {
      config.params = {};
    }

    const url = paramOrDefault(
      config.params.url,
      `https://bidder.adquery.io/prebid/qid`,
      config.params.urlArg
    );

    const resp = function (callback) {
      let qid = window.qid;

      if (!qid) {
        const ramdomValues = Array.from(window.crypto.getRandomValues(new Uint32Array(4)));
        qid = ramdomValues.map(val => val.toString(36)).join('').substring(0, 20);

        logInfo('adqueryIdSubmodule ID QID GENERTAED:', qid);
      }
      logInfo('adqueryIdSubmodule ID QID:', qid);

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
          if (responseObj.qid) {
            let myQid = responseObj.qid;
            storage.setDataInLocalStorage('qid', myQid);
            return callback(myQid);
          }
          callback();
        },
        error: error => {
          logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
          callback();
        }
      };
      ajax(url + '?qid=' + qid, callbacks, undefined, {method: 'GET'});
    };
    return {callback: resp};
  },
  eids: {
    'qid': {
      source: 'adquery.io',
      atype: 1
    },
  }
};

submodule('userId', adqueryIdSubmodule);
