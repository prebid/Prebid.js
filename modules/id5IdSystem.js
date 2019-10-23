/**
 * This module adds ID5 to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/unifiedIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils'
import {ajax} from '../src/ajax';
import {submodule} from '../src/hook';

/** @type {Submodule} */
export const id5IdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'id5Id',
  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode(value) {
    return (value && typeof value['ID5ID'] === 'string') ? { 'id5id': value['ID5ID'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(configParams, consentData, cacheIdObj) {
    if (!configParams || typeof configParams.partner !== 'number') {
      utils.logError(`User ID - ID5 submodule requires partner to be defined as a number`);
      return undefined;
    }
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    const storedUserId = this.decode(cacheIdObj);
    const url = `https://id5-sync.com/g/v1/${configParams.partner}.json?1puid=${storedUserId ? storedUserId.id5id : ''}&gdpr=${hasGdpr}&gdpr_consent=${gdprConsentString}`;

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
      }, undefined, { method: 'GET', withCredentials: true });
    };
    return {callback: resp};
  }
};

submodule('userId', id5IdSubmodule);
