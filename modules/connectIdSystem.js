/**
 * This module adds support for Yahoo ConnectID to the user ID module system.
 * The {@link module:modules/userId} module is required
 * @module modules/connectIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';

import {getRefererInfo} from '../src/refererDetection.js';
import {getStorageManager} from '../src/storageManager.js';
import {formatQS, isNumber, isPlainObject, logError, parseUrl} from '../src/utils.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'connectId';
const STORAGE_EXPIRY_DAYS = 365;
const STORAGE_DURATION = 60 * 60 * 24 * 1000 * STORAGE_EXPIRY_DAYS;
const ID_EXPIRY_DAYS = 14;
const VALID_ID_DURATION = 60 * 60 * 24 * 1000 * ID_EXPIRY_DAYS;
const PUID_EXPIRY_DAYS = 30;
const PUID_EXPIRY = 60 * 60 * 24 * 1000 * PUID_EXPIRY_DAYS;
const VENDOR_ID = 25;
const PLACEHOLDER = '__PIXEL_ID__';
const UPS_ENDPOINT = `https://ups.analytics.yahoo.com/ups/${PLACEHOLDER}/fed`;
const OVERRIDE_OPT_OUT_KEY = 'connectIdOptOut';
const INPUT_PARAM_KEYS = ['pixelId', 'he', 'puid'];
const O_AND_O_DOMAINS = [
  'yahoo.com',
  'aol.com',
  'aol.ca',
  'aol.de',
  'aol.co.uk',
  'engadget.com',
  'techcrunch.com',
  'autoblog.com',
];
export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/**
 * @function
 * @param {Object} obj
 */
function storeObject(obj) {
  const expires = Date.now() + STORAGE_DURATION;
  if (storage.cookiesAreEnabled()) {
    setEtldPlusOneCookie(MODULE_NAME, JSON.stringify(obj), new Date(expires), getSiteHostname());
  }
  if (storage.localStorageIsEnabled()) {
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
      } catch (e) {
        logError(`${MODULE_NAME} module: error while reading the local storage data.`);
      }
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

function syncLocalStorageToCookie() {
  if (!storage.cookiesAreEnabled()) {
    return;
  }
  const value = getIdFromLocalStorage();
  const newCookieExpireTime = Date.now() + STORAGE_DURATION;
  setEtldPlusOneCookie(MODULE_NAME, JSON.stringify(value), new Date(newCookieExpireTime), getSiteHostname());
}

function isStale(storedIdData) {
  if (isOAndOTraffic()) {
    return true;
  } else if (isPlainObject(storedIdData) && storedIdData.lastSynced) {
    const validTTL = storedIdData.ttl || VALID_ID_DURATION;
    return storedIdData.lastSynced + validTTL <= Date.now();
  }
  return false;
}

function getStoredId() {
  let storedId = getIdFromCookie();
  if (!storedId) {
    storedId = getIdFromLocalStorage();
    if (storedId && !isStale(storedId)) {
      syncLocalStorageToCookie();
    }
  }
  return storedId;
}

function getSiteHostname() {
  const pageInfo = parseUrl(getRefererInfo().page);
  return pageInfo.hostname;
}

function isOAndOTraffic() {
  let referer = getRefererInfo().ref;

  if (referer) {
    referer = parseUrl(referer).hostname;
    const subDomains = referer.split('.');
    referer = subDomains.slice(subDomains.length - 2, subDomains.length).join('.');
  }
  return O_AND_O_DOMAINS.indexOf(referer) >= 0;
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
    if (!params ||
        (typeof params.pixelId === 'undefined' && typeof params.endpoint === 'undefined')) {
      logError(`${MODULE_NAME} module: configuration requires the 'pixelId'.`);
      return;
    }

    const storedId = getStoredId();

    let shouldResync = isStale(storedId);

    if (storedId) {
      if (isPlainObject(storedId) && storedId.puid && storedId.lastUsed && !params.puid &&
        (storedId.lastUsed + PUID_EXPIRY) <= Date.now()) {
        delete storedId.puid;
        shouldResync = true;
      }
      if ((params.he && params.he !== storedId.he) ||
        (params.puid && params.puid !== storedId.puid)) {
        shouldResync = true;
      }
      if (!shouldResync) {
        storedId.lastUsed = Date.now();
        storeObject(storedId);
        return {id: storedId};
      }
    }

    const uspString = consentData.usp || '';
    const data = {
      v: '1',
      '1p': [1, '1', true].includes(params['1p']) ? '1' : '0',
      gdpr: connectIdSubmodule.isEUConsentRequired(consentData?.gdpr) ? '1' : '0',
      gdpr_consent: connectIdSubmodule.isEUConsentRequired(consentData?.gdpr) ? consentData.gdpr.consentString : '',
      us_privacy: uspString
    };

    const gppConsent = consentData.gpp;
    if (gppConsent) {
      data.gpp = `${gppConsent.gppString ? gppConsent.gppString : ''}`;
      if (Array.isArray(gppConsent.applicableSections)) {
        data.gpp_sid = gppConsent.applicableSections.join(',');
      }
    }

    const topmostLocation = getRefererInfo().topmostLocation;
    if (typeof topmostLocation === 'string') {
      data.url = topmostLocation.split('?')[0];
    }

    INPUT_PARAM_KEYS.forEach(key => {
      if (typeof params[key] !== 'undefined') {
        data[key] = params[key];
      }
    });

    const hashedEmail = params.he || storedId?.he;
    if (hashedEmail) {
      data.he = hashedEmail;
    }
    if (!data.puid && storedId?.puid) {
      data.puid = storedId.puid;
    }

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseObj;
          if (response) {
            try {
              responseObj = JSON.parse(response);
              if (isPlainObject(responseObj) && Object.keys(responseObj).length > 0 &&
                 (!!responseObj.connectId || !!responseObj.connectid)) {
                responseObj.he = params.he;
                responseObj.puid = params.puid || responseObj.puid;
                responseObj.lastSynced = Date.now();
                responseObj.lastUsed = Date.now();
                if (isNumber(responseObj.ttl)) {
                  let validTTLMiliseconds = responseObj.ttl * 60 * 60 * 1000;
                  if (validTTLMiliseconds > VALID_ID_DURATION) {
                    validTTLMiliseconds = VALID_ID_DURATION;
                  }
                  responseObj.ttl = validTTLMiliseconds;
                }
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
      const url = `${params.endpoint || endpoint}?${formatQS(data)}`;
      connectIdSubmodule.getAjaxFn()(url, callbacks, null, {method: 'GET', withCredentials: true});
    };
    const result = {callback: resp};
    if (shouldResync && storedId) {
      result.id = storedId;
    }

    return result;
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
   * has opted out via the Yahoo easy-opt-out mechanism.
   * @returns {Boolean}
   */
  userHasOptedOut() {
    try {
      if (storage.localStorageIsEnabled()) {
        return storage.getDataFromLocalStorage(OVERRIDE_OPT_OUT_KEY) === '1';
      } else {
        return true;
      }
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
  },
  eids: {
    'connectId': {
      source: 'yahoo.com',
      atype: 3
    },
  }
};

submodule('userId', connectIdSubmodule);
