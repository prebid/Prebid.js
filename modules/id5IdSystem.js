/**
 * This module adds ID5 to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/unifiedIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils'
import {ajax} from '../src/ajax';
import {format} from '../src/url';
import {submodule} from '../src/hook';

const ID5_PROTOCOL = 'https';
const ID5_HOSTNAME = 'id5-sync.com';
const ID5_PATH = '/g/v1';

function fetchId(configParams, consentData, cachedIdObj) {
  if (!configParams || typeof configParams.partner !== 'number') {
    utils.logError(`User ID - ID5 submodule requires partner to be defined as a number`);
    return undefined;
  }

  const url = {
    protocol: ID5_PROTOCOL,
    hostname: ID5_HOSTNAME,
    pathname: `${ID5_PATH}/${config.partner}.json`
  };

  const storedUserId = this.decode(cachedIdObj);
  const hasGdpr = (consentData && utils.isBoolean(consentData.gdprApplies) && consentData.gdprApplies) ? 1 : 0;
  const searchParams = {
    '1puid': storedUserId ? storedUserId.id5id : '',
    gdpr: hasGdpr,
    gdpr_consent: hasGdpr ? consentData.consentString : ''
  };

  return function (callback) {
    ajax(format(url), response => {
      let responseObj;
      if (response) {
        try {
          responseObj = JSON.parse(response);
        } catch (error) {
          utils.logError(error);
        }
      }
      callback(responseObj);
    }, searchParams, { method: 'GET', withCredentials: true });
  };
};

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
   * performs action to refresh an id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {(Object|function(callback:function))}
   */
  refreshId(configParams, consentData, cachedIdObj) {
    return fetchId(configParams, consentData, cachedIdObj);
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @returns {(Object|function(callback:function))}
   */
  getId(configParams, consentData) {
    return fetchId(configParams, consentData);
  }
};

submodule('userId', id5IdSubmodule);
