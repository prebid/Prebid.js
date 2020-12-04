/**
 * This module adds MediaWallah OpenLink to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/mwOpenLinkIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { uspDataHandler } from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';

var openLinkID = {
  name: 'mwol',
  cookie_expiration: (86400 * 1000 * 365 * 3),
  value: ''
}

const storage = getStorageManager();
var configParams = {};

function getExpirationDate() {
  const oneYearFromNow = new Date(utils.timestamp() + openLinkID.cookie_expiration);
  return oneYearFromNow.toGMTString();
}

function isValidConfig(configParams) {
  if (!configParams) {
    utils.logError('User ID - mwOlId submodule requires configParams');
    return false;
  }
  if (!configParams.accountId) {
    utils.logError('User ID - mwOlId submodule requires account Id to be defined');
    return false;
  }
  if (!configParams.partnerId) {
    utils.logError('User ID - mwOlId submodule requires partner Id to be defined');
    return false;
  }
  if (configParams.storage) {
    utils.logWarn('User ID - mwOlId submodule does not require a storage config');
  }
  return true;
}

function deserializeMWOlId(mwOLIdStr) {
  const mwOLId = {};
  const values = mwOLId.split(',');

  values.forEach(function(value) {
    const pair = value.split(':');
    // unpack a value of 1 as true
    mwOLId[pair[0]] = +pair[1] === 1 ? true : pair[1];
  });

  return mwOLId;
}

function serializeMWOLId(mwOLId) {
  let components = [];

  if (mwOLId.eid) {
    components.push('eid:' + mwOLId.eid);
  }
  if (mwOLId.ibaOptout) {
    components.push('ibaOptout:1');
  }
  if (mwOLId.ccpaOptout) {
    components.push('ccpaOptout:1');
  }

  return components.join(',');
}

function readCookie(name) {
  const mwOlIdStr = storage.getCookie(name);
  if (mwOlIdStr) {
    return deserializeMWOlId(decodeURIComponent(mwOlIdStr));
  }
  return null;
}

function writeCookie(mwOLId) {
  if (mwOLId) {
    const mwOLIdStr = encodeURIComponent(serializeMWOLId(mwOLId));
    storage.setCookie(openLinkID.name, mwOLIdStr, getExpirationDate(), 'lax');
  }
}

/* MW */

async function generateUUID() { // Public Domain/MIT
  var d = new Date().getTime();// Timestamp
  var d2 = (performance && performance.now && (performance.now() * 1000)) || 0;// Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16;// random number between 0 and 16
    if (d > 0) { // Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else { // Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function register(olid) {
  var accountId = (configParams.accountId != 'undefined') ? configParams.accountId : '';
  var partnerId = (configParams.partnerId != 'undefined') ? configParams.partnerId : '';
  var uid = (configParams.uid != 'undefined') ? configParams.uid : '';
  var url = 'https://ol.mediawallahscript.com/?account_id=' + accountId +
            '&partner_id=' + partnerId +
            '&uid=' + uid +
            '&olid=' + olid +
            '&cb=' + Math.random()
            ;
  ajax(url);
}

async function setID(configParams) {
  if (!isValidConfig(configParams)) return;

  let mwOLId = readCookie();
  openLinkID.value = await generateUUID();
  register(openLinkID.value);

  const eid = (mwOLId) ? mwOLId.eid : null;
  const refererInfo = getRefererInfo();
  const uspString = uspDataHandler.getConsentData();

  const data = {
    eid,
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

  let newmwOLId = mwOLId ? utils.deepClone(mwOLId) : generateUUID();
  try {
    let responseObj = JSON.parse(response);
    if (responseObj) {
      if (responseObj.ccpaOptout !== true) {
        newmwOLId.eid = responseObj.eid;
      } else {
        newmwOLId.eid = null;
        newmwOLId.ccpaOptout = true;
      }
      if (responseObj.ibaOptout === true) {
        newmwOLId.ibaOptout = true;
      }
    }
  } catch (error) {
    utils.logError(error);
  }
  writeCookie(newmwOLId);
  register(mwOLId);

  return {
    id: mwOLId
  };
};

/* End MW */

/** @type {Submodule} */
export const mwOpenLinkSubModule = {
  /**
     * used to link submodule with config
     * @type {string}
     */
  name: 'mwOlId',
  /**
     * decode the stored id value for passing to bid requests
     * @function
     * @param {MwOlId} mwOlId
     * @return {(Object|undefined}
     */
  decode(mwOlId) {
    if (mwOlId && utils.isPlainObject(mwOlId)) {
      return { mwOlId };
    }
    return undefined;
  },

  /**
     * performs action to obtain id and return a value in the callback's response argument
     * @function
     * @param {SubmoduleParams} [configParams]
     * @param {ConsentData} [consentData]
     * @returns {function(callback:function), id:MwOlId}
     */
  getId(configParams, consentData, currentStoredId) {
    if (!isValidConfig(configParams)) return;
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    // use protocol relative urls for http or https
    if (hasGdpr && (!gdprConsentString || gdprConsentString === '')) {
      utils.logInfo('Consent string is required to generate or retrieve ID.');
      return;
    }
    return setID(configParams);
  }
};

submodule('userId', mwOpenLinkSubModule);
