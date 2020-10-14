/**
 * This module adds merkleId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/merkleIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js'

const MODULE_NAME = 'merkleId';

/** @type {Submodule} */
export const merkleIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{merkleId:string}}
   */
  decode(value) {
    const id = (value && value.ppid && typeof value.ppid.id === 'string') ? value.ppid.id : undefined;
    return id ? { 'merkleId': id } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(configParams, consentData) {
    if (!configParams || typeof configParams.pubid !== 'string') {
      utils.logError('User ID - merkleId submodule requires a valid pubid to be defined');
      return;
    }

    if (typeof configParams.ptk !== 'string') {
      utils.logError('User ID - merkleId submodule requires a valid ptk string to be defined');
      return;
    }

    if (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
      utils.logError('User ID - merkleId submodule does not currently handle consent strings');
      return;
    }

    const url = `https://mid.rkdms.com/idsv2?ptk=${configParams.ptk}&pubid=${configParams.pubid}`;

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
          utils.logError(`${MODULE_NAME}: merkleId fetch encountered an error`, error);
          callback();
        }
      };
      ajax(url, callbacks, undefined, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  }
};

submodule('userId', merkleIdSubmodule);
