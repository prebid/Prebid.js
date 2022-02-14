/**
 * This module adds AdriverId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/adriverIdSubmodule
 * @requires module:modules/userId
 */

import { logError, isPlainObject } from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'adriverId';

export const storage = getStorageManager();

/** @type {Submodule} */
export const adriverIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{adriverId:string}}
   */
  decode(value) {
    return { adrcid: value }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    if (!isPlainObject(config.params)) {
      config.params = {};
    }
    const url = 'https://ad.adriver.ru/cgi-bin/json.cgi?sid=1&ad=719473&bt=55&pid=3198680&bid=7189165&bn=7189165&tuid=1';
    const resp = function (callback) {
      let creationDate = storage.getDataFromLocalStorage('adrcid_cd') || storage.getCookie('adrcid_cd');
      let cookie = storage.getDataFromLocalStorage('adrcid') || storage.getCookie('adrcid');

      if (cookie && creationDate && ((new Date().getTime() - creationDate) < 86400000)) {
        const responseObj = cookie;
        callback(responseObj);
      } else {
        const callbacks = {
          success: response => {
            let responseObj;
            if (response) {
              try {
                responseObj = JSON.parse(response).adrcid;
              } catch (error) {
                logError(error);
              }
              let now = new Date();
              now.setTime(now.getTime() + 86400 * 1825 * 1000);
              storage.setCookie('adrcid', responseObj, now.toUTCString(), 'Lax');
              storage.setDataInLocalStorage('adrcid', responseObj);
              storage.setCookie('adrcid_cd', new Date().getTime(), now.toUTCString(), 'Lax');
              storage.setDataInLocalStorage('adrcid_cd', new Date().getTime());
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

submodule('userId', adriverIdSubmodule);
