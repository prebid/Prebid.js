/**
 * This module adds HaloID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/haloIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import * as utils from '../src/utils.js';

const MODULE_NAME = 'haloId';
const AU_GVLID = 561;

export const storage = getStorageManager(AU_GVLID, 'halo');

/** @type {Submodule} */
export const haloIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{value:string}} value
   * @returns {{haloId:Object}}
   */
  decode(value) {
    let haloId = storage.getDataFromLocalStorage('auHaloId');
    if (utils.isStr(haloId)) {
      return {haloId: haloId};
    }
    return (value && typeof value['haloId'] === 'string') ? { 'haloId': value['haloId'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const url = `https://id.halo.ad.gt/api/v1/pbhid`;

    const resp = function (callback) {
      let haloId = storage.getDataFromLocalStorage('auHaloId');
      if (utils.isStr(haloId)) {
        const responseObj = {haloId: haloId};
        callback(responseObj);
      } else {
        const callbacks = {
          success: response => {
            let responseObj;
            if (response) {
              try {
                responseObj = JSON.parse(response);
              } catch (error) {
                utils.logError(error);
              }
            }
            callback(responseObj);
          },
          error: error => {
            utils.logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
            callback();
          }
        };
        ajax(url, callbacks, undefined, {method: 'GET'});
      }
    };
    return {callback: resp};
  }
};

submodule('userId', haloIdSubmodule);
