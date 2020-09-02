/**
 * This module adds HaloID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/haloIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js'
import {getGlobal} from '../src/prebidGlobal.js';

const MODULE_NAME = 'haloId';

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
    return (value && typeof value['haloId'] === 'string') ? { 'haloId': value['haloId'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {IdResponse|undefined}
   */
  getId(configParams) {
    // use protocol relative urls for http or https
    const url = `https://id.halo.ad.gt/api/v1/pbhid`;

    const resp = function (callback) {
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
      const userIds = (getGlobal()).getUserIds();
      ajax(url, callbacks, userIds);
    };
    return {callback: resp};
  }
};

submodule('userId', haloIdSubmodule);
