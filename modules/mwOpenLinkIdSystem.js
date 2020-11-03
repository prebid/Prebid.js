/**
 * This module adds Parrable to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/mwOpenLinkIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';

var openLinkID = {
  name: 'mwol',
  cookie_expiration: (86400 * 1000 * 365 * 3),
  value: ''
}

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

async function readCookie(name) {
  name += '=';
  for (var ca = document.cookie.split(/;\s*/), i = ca.length - 1; i >= 0; i--) {
    if (!ca[i].indexOf(name)) {
      return ca[i].replace(name, '');
    }
  }
}

async function writeCookie(name, value) {
  var date = new Date();
  date.setTime(date.getTime() + getExpirationDate()); // 3 year expiration
  var expires = '; expires=' + date.toUTCString();

  document.cookie = name + '=' + value + expires + '; path=/';
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

async function localStorageSupported() {
  try {
    var item = 1;
    localStorage.setItem(item, item);
    localStorage.removeItem(item);
    return true;
  } catch (e) {
    return false;
  }
}

async function readLocalStorage(name) {
  var localStorageItem = localStorage.getItem(name);
  return (localStorageItem != 'undefined') ? localStorageItem : '';
}

async function confirmID() {
  openLinkID.value = await readCookie(openLinkID.name) || '';
  if (typeof openLinkID.value != 'undefined' &&
        openLinkID.value !== null &&
        openLinkID.value.length > 0) {
  } else {
    openLinkID.value = (await localStorageSupported() == true) ? await readLocalStorage(openLinkID.name) : openLinkID.value;
  }
  if (typeof openLinkID.value != 'undefined' &&
        openLinkID.value !== null &&
        openLinkID.value.length > 0) {
  } else {
    openLinkID.value = await generateUUID();
    register(openLinkID.value);
  }
  return openLinkID.value;
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

async function setID() {
  var olid = await confirmID();

  if (localStorageSupported() == true) {
    localStorage.setItem(openLinkID.name, olid);
  }
  writeCookie(openLinkID.name, olid);
  return olid;
}

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
    var Id = setID(configParams);
    return Id;
  }
};

submodule('userId', mwOpenLinkSubModule);
