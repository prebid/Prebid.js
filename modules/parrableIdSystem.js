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
import { getStorageManager } from '../src/storageManager.js';

const PARRABLE_URL = 'https://h.parrable.com/prebid';
const LEGACY_COOKIE_NAME = '_parrable_eid';

const storage = getStorageManager();
const cookieExpireDate = new Date(0).toString();

function deserializeParrableId(parrableIdStr) {
  const parrableId = {};
  const values = parrableIdStr.split(',');

  values.forEach(function(value) {
    const pair = value.split(':');
    // unpack a value of 1 as true
    parrableId[pair[0]] = +pair[1] === 1 ? true : pair[1];
  });

  return parrableId;
}

function serializeParrableId(parrableId) {
  let str = '';
  if (parrableId.eid) {
    str += 'eid:' + parrableId.eid;
  }
  if (parrableId.ibaOptout) {
    str += ',ibaOptout:1';
  }
  if (parrableId.ccpaOptout) {
    str += ',ccpaOptout:1';
  }
  return str;
}

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

function readLegacyEid() {
  legacyEid = storage.getCookie(LEGACY_COOKIE_NAME);
  if (legacyEid) {
    storage.setCookie(LEGACY_COOKIE_NAME, '', cookieExpireDate);
    return legacyEid;
  }
  return undefined;
}

function fetchId(configParams, parrableIdStr) {
  if (!isValidConfig(configParams)) return;

  const parrableId = deserializeParrableId(parrableIdStr);
  const legacyEid = readLegacyEid();
  const refererInfo = getRefererInfo();
  const uspString = uspDataHandler.getConsentData();

  const data = {
    eid: (parrableId && parrableId.eid) || legacyEid || null,
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
    const onSuccess = (response) => {
      let parrableId = {};
      if (response) {
        try {
          let responseObj = JSON.parse(response);
          if (responseObj) {
            parrableId = {
              eid: responseObj.eid,
              ibaOptout: responseObj.ibaOptout,
              ccpaOptout: responseObj.ccpaOptout
            };
          }
          eid = responseObj ? responseObj.eid : undefined;
        } catch (error) {
          utils.logError(error);
        }
      }
      cb(serializeParrableId(parrableId));
    };
    ajax(PARRABLE_URL, onSuccess, searchParams, options);
  };

  // provide the legacyStoredId so it gets used in auction on the first
  // impression where the legacy cookie is migrated to the new cookie
  return {
    callback,
    id: serializeParrableId({ eid: legacyStoredId })
  };
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
   * @param {string} value
   * @return {(Object|undefined}
   */
  decode(value) {
    if (value && utils.isStr(value)) {
      const idObject = deserializeParrableId(value);
      return { 'parrableId': idObject };
    }
    return undefined;
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
