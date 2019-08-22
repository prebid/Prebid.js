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
   * @function
   * @param {{ID5ID:Object}} value
   * @returns {{id5id:String}}
   */
  decode(value) {
    return (value && typeof value['ID5ID'] === 'string') ? { 'id5id': value['ID5ID'] } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @returns {function(callback:function)}
   */
  getId(configParams, consentData) {
    if (!configParams || typeof configParams.partner !== 'number') {
      utils.logError(`User ID - ID5 submodule requires partner to be defined as a number`);
      return;
    }
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    const url = `https://id5-sync.com/g/v1/${configParams.partner}.json?gdpr=${hasGdpr}&gdpr_consent=${gdprConsentString}`;

    return function (callback) {
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
      }, undefined, { method: 'GET' });
    }
  }
};

submodule('userId', id5IdSubmodule);
