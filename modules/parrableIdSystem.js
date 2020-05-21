/**
 * This module adds Parrable to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/parrableIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { uspDataHandler } from '../src/adapterManager.js';

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

function fetchId(configParams, currentStoredId) {
  if (!isValidConfig(configParams)) return;

  const refererInfo = getRefererInfo();
  const uspString = uspDataHandler.getConsentData();

  const data = {
    eid: currentStoredId || null,
    trackers: configParams.partner.split(','),
    url: refererInfo.referer
  };

  const searchParams = {
    data: btoa(JSON.stringify(data)),
    _rand: Math.random()
  };

  if (uspString) {
    searchParams.us_privacy = uspString;
  }

  const options = {
    method: 'GET',
    withCredentials: true
  };

  const callback = function (cb) {
    const callbacks = {
      success: response => {
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
      },
      error: error => {
        utils.logError(`parrableId: ID fetch encountered an error`, error);
        cb();
      }
    };
    ajax(PARRABLE_URL, callbacks, searchParams, options);
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
  getId(configParams, gdprConsentData, currentStoredId) {
    return fetchId(configParams, currentStoredId);
  }
};

submodule('userId', parrableIdSubmodule);
