/**
 * This module adds HadronID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/hadronIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isFn, isStr, isPlainObject, logError, logInfo} from '../src/utils.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

const HADRONID_LOCAL_NAME = 'auHadronId';
const MODULE_NAME = 'hadronId';
const AU_GVLID = 561;
const DEFAULT_HADRON_URL_ENDPOINT = 'https://id.hadron.ad.gt/api/v1/pbhid';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: 'hadron'});

/**
 * Param or default.
 * @param {String|function} param
 * @param {String} defaultVal
 * @param arg
 */
function paramOrDefault(param, defaultVal, arg) {
  if (isFn(param)) {
    return param(arg);
  } else if (isStr(param)) {
    return param;
  }
  return defaultVal;
}

/**
 * @param {string} url
 * @param {string} params
 * @returns {string}
 */
const urlAddParams = (url, params) => {
  return url + (url.indexOf('?') > -1 ? '&' : '?') + params
}

/** @type {Submodule} */
export const hadronIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  gvlid: AU_GVLID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {Object}
   */
  decode(value) {
    const hadronId = storage.getDataFromLocalStorage(HADRONID_LOCAL_NAME);
    if (isStr(hadronId)) {
      return {hadronId: hadronId};
    }
    return (value && typeof value['hadronId'] === 'string') ? {'hadronId': value['hadronId']} : undefined;
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
    const partnerId = config.params.partnerId | 0;
    let hadronId = storage.getDataFromLocalStorage(HADRONID_LOCAL_NAME);
    if (isStr(hadronId)) {
      return {id: {hadronId}};
    }
    const resp = function (callback) {
      let responseObj = {};
      const callbacks = {
        success: response => {
          if (response) {
            try {
              responseObj = JSON.parse(response);
            } catch (error) {
              logError(error);
            }
            logInfo(`Response from backend is ${responseObj}`);
            hadronId = responseObj['hadronId'];
            storage.setDataInLocalStorage(HADRONID_LOCAL_NAME, hadronId);
            responseObj = {id: {hadronId}};
          }
          callback(responseObj);
        },
        error: error => {
          logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
          callback();
        }
      };
      logInfo('HadronId not found in storage, calling backend...');
      const url = urlAddParams(
        // config.params.url and config.params.urlArg are not documented
        // since their use is for debugging purposes only
        paramOrDefault(config.params.url, DEFAULT_HADRON_URL_ENDPOINT, config.params.urlArg),
        `partner_id=${partnerId}&_it=prebid`
      );
      ajax(url, callbacks, undefined, {method: 'GET'});
    };
    return {callback: resp};
  }
};

submodule('userId', hadronIdSubmodule);
