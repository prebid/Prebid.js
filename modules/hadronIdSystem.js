/**
 * This module adds HadronID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/hadronIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import { isFn, isStr, isPlainObject, logError } from '../src/utils.js';

const MODULE_NAME = 'hadronId';
const AU_GVLID = 561;
const DEFAULT_HADRON_URL_ENDPOINT = 'https://id.hadron.ad.gt/api/v1/pbhid';

export const storage = getStorageManager({gvlid: AU_GVLID, moduleName: 'hadron'});

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
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {Object}
   */
  decode(value) {
    let hadronId = storage.getDataFromLocalStorage('auHadronId');
    if (isStr(hadronId)) {
      return {hadronId: hadronId};
    }
    return (value && typeof value['hadronId'] === 'string') ? { 'hadronId': value['hadronId'] } : undefined;
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

    const url = urlAddParams(
      paramOrDefault(config.params.url, DEFAULT_HADRON_URL_ENDPOINT, config.params.urlArg),
      `partner_id=${partnerId}&_it=prebid`
    );

    const resp = function (callback) {
      let hadronId = storage.getDataFromLocalStorage('auHadronId');
      if (isStr(hadronId)) {
        const responseObj = {hadronId: hadronId};
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

submodule('userId', hadronIdSubmodule);
