/**
 * This module adds UnifiedId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/unifiedIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils'
import {ajax} from '../src/ajax';
import {submodule} from '../src/hook'

const MODULE_NAME = 'unifiedId';

/** @type {Submodule} */
export const unifiedIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{TDID:string}} value
   * @returns {{tdid:Object}}
   */
  decode(value) {
    return (value && typeof value['TDID'] === 'string') ? { 'tdid': value['TDID'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {IdResponse|undefined}
   */
  getId(configParams) {
    if (!configParams || (typeof configParams.partner !== 'string' && typeof configParams.url !== 'string')) {
      utils.logError('User ID - unifiedId submodule requires either partner or url to be defined');
      return;
    }
    // use protocol relative urls for http or https
    const url = configParams.url || `//match.adsrvr.org/track/rid?ttd_pid=${configParams.partner}&fmt=json`;

    const resp = function (callback) {
      ajax(url, response => {
        let responseObj;
        if (response) {
          try {
            responseObj = JSON.parse(response);
          } catch (error) {
            utils.logError(error);
          }
        }
        callback(responseObj);
      }, undefined, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  }
};

submodule('userId', unifiedIdSubmodule);
