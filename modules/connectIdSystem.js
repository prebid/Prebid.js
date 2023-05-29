/**
 * This module adds support for Yahoo ConnectID to the user ID module system.
 * The {@link module:modules/userId} module is required
 * @module modules/connectIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {includes} from '../src/polyfill.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {getStorageManager} from '../src/storageManager.js';
import {formatQS, isPlainObject, logError, parseUrl} from '../src/utils.js';
import {uspDataHandler} from '../src/adapterManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

const MODULE_NAME = 'connectId';
const STORAGE_EXPIRY_DAYS = 14;
const VENDOR_ID = 25;
const PLACEHOLDER = '__PIXEL_ID__';
const UPS_ENDPOINT = `https://ups.analytics.yahoo.com/ups/${PLACEHOLDER}/fed`;
const OVERRIDE_OPT_OUT_KEY = 'connectIdOptOut';
const INPUT_PARAM_KEYS = ['pixelId', 'he', 'puid'];
export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/**
 * @function
 * @param {Object} obj
 */
function storeObject(obj) {
  const expires = Date.now() + (60 * 60 * 24 * 1000 * STORAGE_EXPIRY_DAYS);
  if (storage.cookiesAreEnabled()) {
    setEtldPlusOneCookie(MODULE_NAME, JSON.stringify(obj), new Date(expires), getSiteHostname());
  } else if (storage.localStorageIsEnabled()) {
    obj.__expires = expires;
    storage.setDataInLocalStorage(MODULE_NAME, JSON.stringify(obj));
  }
}

/**
 * Attempts to store a cookie on eTLD + 1
 *
 * @function
 * @param {String} key
 * @param {String} value
 * @param {Date} expirationDate
 * @param {String} hostname
 */
function setEtldPlusOneCookie(key, value, expirationDate, hostname) {
  const subDomains = hostname.split('.');
  for (let i = 0; i < subDomains.length; ++i) {
    const domain = subDomains.slice(subDomains.length - i - 1, subDomains.length).join('.');
    try {
      storage.setCookie(key, value, expirationDate.toUTCString(), null, '.' + domain);
      const storedCookie = storage.getCookie(key);
      if (storedCookie && storedCookie === value) {
        break;
      }
    } catch (error) {}
  }
}

function getIdFromCookie() {
  if (storage.cookiesAreEnabled()) {
    try {
      return JSON.parse(storage.getCookie(MODULE_NAME));
    } catch {}
  }
  return null;
}

function getIdFromLocalStorage() {
  if (storage.localStorageIsEnabled()) {
    let storedIdData = storage.getDataFromLocalStorage(MODULE_NAME);
    if (storedIdData) {
      try {
        storedIdData = JSON.parse(storedIdData);
      } catch {}
      if (isPlainObject(storedIdData) && storedIdData.__expires &&
          storedIdData.__expires <= Date.now()) {
        storage.removeDataFromLocalStorage(MODULE_NAME);
        return null;
      }
      return storedIdData;
    }
  }
  return null;
}

function getSiteHostname() {
  const pageInfo = parseUrl(getRefererInfo().page);
  return pageInfo.hostname;
}

/** @type {Submodule} */
export const connectIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * @type {Number}
   */
  gvlid: VENDOR_ID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{connectId: string} | undefined}
   */
  decode(value) {
    if (connectIdSubmodule.userHasOptedOut()) {
      return undefined;
    }
    return (isPlainObject(value) && (value.connectId || value.connectid))
      ? {connectId: value.connectId || value.connectid} : undefined;
  },
  /**
   * Gets the Yahoo ConnectID
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    if (connectIdSubmodule.userHasOptedOut()) {
      return;
    }
    const params = config.params || {};
    if (!params || (typeof params.he !== 'string' && typeof params.puid !== 'string') ||
        (typeof params.pixelId === 'undefined' && typeof params.endpoint === 'undefined')) {
      logError(`${MODULE_NAME} module: configurataion requires the 'pixelId' and at ` +
                `least one of the 'he' or 'puid' parameters to be defined.`);
      return;
    }

    const storedId = getIdFromCookie() || getIdFromLocalStorage();
    if (storedId) {
      return {id: storedId};
    }

    const uspString = uspDataHandler.getConsentData() || '';
    const data = {
      v: '1',
      '1p': includes([1, '1', true], params['1p']) ? '1' : '0',
      gdpr: connectIdSubmodule.isEUConsentRequired(consentData) ? '1' : '0',
      gdpr_consent: connectIdSubmodule.isEUConsentRequired(consentData) ? consentData.consentString : '',
      us_privacy: uspString
    };

    let topmostLocation = getRefererInfo().topmostLocation;
    if (typeof topmostLocation === 'string') {
      data.url = topmostLocation.split('?')[0];
    }

    INPUT_PARAM_KEYS.forEach(key => {
      if (typeof params[key] != 'undefined') {
        data[key] = params[key];
      }
    });

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseObj;
          if (response) {
            try {
              responseObj = JSON.parse(response);
              if (isPlainObject(responseObj) && Object.keys(responseObj).length > 0) {
                storeObject(responseObj);
              } else {
                logError(`${MODULE_NAME} module: UPS response returned an invalid payload ${response}`);
              }
            } catch (error) {
              logError(error);
            }
          }
          callback(responseObj);
        },
        error: error => {
          logError(`${MODULE_NAME} module: ID fetch encountered an error`, error);
          callback();
        }
      };
      const endpoint = UPS_ENDPOINT.replace(PLACEHOLDER, params.pixelId);
      let url = `${params.endpoint || endpoint}?${formatQS(data)}`;
      connectIdSubmodule.getAjaxFn()(url, callbacks, null, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  },

  /**
   * Utility function that returns a boolean flag indicating if the opportunity
   * is subject to GDPR
   * @returns {Boolean}
   */
  isEUConsentRequired(consentData) {
    return !!(consentData?.gdprApplies);
  },

  /**
   * Utility function that returns a boolean flag indicating if the user
   * has opeted out via the Yahoo easy-opt-out mechanism.
   * @returns {Boolean}
   */
  userHasOptedOut() {
    try {
      return localStorage.getItem(OVERRIDE_OPT_OUT_KEY) === '1';
    } catch {
      return false;
    }
  },

  /**
   * Return the function used to perform XHR calls.
   * Utilised for each of testing.
   * @returns {Function}
   */
  getAjaxFn() {
    return ajax;
  }
};

submodule('userId', connectIdSubmodule);
