/**
 * This module adds Parrable to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/parrableIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils'
import {ajax} from '../src/ajax';
import {submodule} from '../src/hook';

const PARRABLE_URL = 'https://h.parrable.com/prebid';

function isValidConfig(configParams) {
  if (!configParams) {
    utils.logError('User ID - parrableId submodule requires configParams');
    return false;
  }
  if (!configParams.partner) {
    utils.logError('User ID - parrableId submodule requires partner list');
    return false;
  }
  return true;
}

function fetchId(configParams, consentData, currentStoredId) {
  if (!isValidConfig(configParams)) return;

  const data = {
    eid: currentStoredId || null,
    trackers: configParams.partner.split(',')
  };

  const searchParams = {
    data: btoa(JSON.stringify(data)),
    _rand: Math.random()
  };

  const options = {
    method: 'GET',
    withCredentials: true
  };

  const callback = function (cb) {
    const onSuccess = (response) => {
      let eid;
      if (response) {
        try {
          let responseObj = JSON.parse(response);
          eid = responseObj ? responseObj.eid : undefined;
        } catch (error) {
          utils.logError(error);
        }
      }
      cb(eid);
    };
    ajax(PARRABLE_URL, onSuccess, searchParams, options);
  };

  return { callback };
};

/** @type {Submodule} */
export const parrableIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'parrableId',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {Object|string} value
   * @return {(Object|undefined}
   */
  decode(value) {
    return (value && typeof value === 'string') ? { 'parrableid': value } : undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @param {ConsentData} [consentData]
   * @returns {function(callback:function)}
   */
  getId(configParams, consentData, currentStoredId) {
    return fetchId(configParams, consentData, currentStoredId);
  }
};

submodule('userId', parrableIdSubmodule);
