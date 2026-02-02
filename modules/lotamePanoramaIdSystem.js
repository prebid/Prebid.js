/**
 * This module adds LotamePanoramaId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/lotamePanoramaId
 * @requires module:modules/userId
 */
import {
  timestamp,
  isStr,
  logError,
  isBoolean,
  buildUrl,
  isEmpty,
  isArray
} from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const KEY_ID = 'panoramaId';
const KEY_EXPIRY = `${KEY_ID}_expiry`;
const KEY_PROFILE = '_cc_id';
const MODULE_NAME = 'lotamePanoramaId';
const NINE_MONTHS_MS = 23328000 * 1000;
const DAYS_TO_CACHE = 7;
const DAY_MS = 60 * 60 * 24 * 1000;
const MISSING_CORE_CONSENT = 111;
const GVLID = 95;
const ID_HOST = 'id.crwdcntrl.net';
const ID_HOST_COOKIELESS = 'c.ltmsphrcl.net';
const DO_NOT_HONOR_CONFIG = false;

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});
let cookieDomain;
const appliedConfig = {
  name: 'lotamePanoramaId',
  storage: {
    type: 'cookie&html5',
    name: 'panoramaId'
  }
};

/**
 * Set the Lotame First Party Profile ID in the first party namespace
 * @param {String} profileId
 */
function setProfileId(profileId) {
  if (cookiesAreEnabled()) {
    const expirationDate = new Date(timestamp() + NINE_MONTHS_MS).toUTCString();
    storage.setCookie(
      KEY_PROFILE,
      profileId,
      expirationDate,
      'Lax',
      cookieDomain,
      undefined
    );
  }
  if (localStorageIsEnabled()) {
    storage.setDataInLocalStorage(KEY_PROFILE, profileId, undefined);
  }
}

/**
 * Get the Lotame profile id by checking cookies first and then local storage
 */
function getProfileId() {
  let profileId;
  if (cookiesAreEnabled(DO_NOT_HONOR_CONFIG)) {
    profileId = storage.getCookie(KEY_PROFILE, undefined);
  }
  if (!profileId && localStorageIsEnabled(DO_NOT_HONOR_CONFIG)) {
    profileId = storage.getDataFromLocalStorage(KEY_PROFILE, undefined);
  }
  return profileId;
}

/**
 * Get a value from browser storage by checking cookies first and then local storage
 * @param {String} key
 */
function getFromStorage(key) {
  let value = null;
  if (cookiesAreEnabled(DO_NOT_HONOR_CONFIG)) {
    value = storage.getCookie(key, undefined);
  }
  if (value === null && localStorageIsEnabled(DO_NOT_HONOR_CONFIG)) {
    value = storage.getDataFromLocalStorage(key, undefined);
  }
  return value;
}

/**
 * Save a key/value pair to the browser cache (cookies and local storage)
 * @param {String} key
 * @param {String} value
 * @param {Number} expirationTimestamp
 */
function saveLotameCache(
  key,
  value,
  expirationTimestamp = timestamp() + DAYS_TO_CACHE * DAY_MS
) {
  if (key && value) {
    const expirationDate = new Date(expirationTimestamp).toUTCString();
    if (cookiesAreEnabled()) {
      storage.setCookie(
        key,
        value,
        expirationDate,
        'Lax',
        cookieDomain,
        undefined
      );
    }
    if (localStorageIsEnabled()) {
      storage.setDataInLocalStorage(key, value, undefined);
    }
  }
}

/**
 * Retrieve all the cached values from cookies and/or local storage
 * @param {Number} clientId
 */
function getLotameLocalCache(clientId = undefined) {
  const cache = {
    data: getFromStorage(KEY_ID),
    expiryTimestampMs: 0,
    clientExpiryTimestampMs: 0,
  };

  try {
    if (clientId) {
      const rawClientExpiry = getFromStorage(`${KEY_EXPIRY}_${clientId}`);
      if (isStr(rawClientExpiry)) {
        cache.clientExpiryTimestampMs = parseInt(rawClientExpiry, 10);
      }
    }

    const rawExpiry = getFromStorage(KEY_EXPIRY);
    if (isStr(rawExpiry)) {
      cache.expiryTimestampMs = parseInt(rawExpiry, 10);
    }
  } catch (error) {
    logError(error);
  }

  return cache;
}

/**
 * Clear a cached value from cookies and local storage
 * @param {String} key
 */
function clearLotameCache(key) {
  if (key) {
    if (cookiesAreEnabled(DO_NOT_HONOR_CONFIG)) {
      const expirationDate = new Date(0).toUTCString();
      storage.setCookie(
        key,
        '',
        expirationDate,
        'Lax',
        cookieDomain,
        undefined
      );
    }
    if (localStorageIsEnabled(DO_NOT_HONOR_CONFIG)) {
      storage.removeDataFromLocalStorage(key, undefined);
    }
  }
}
/**
 * @param {boolean} honorConfig - false to override for reading or deleting old cookies
 * @returns {boolean} for whether we can write the cookie
 */
function cookiesAreEnabled(honorConfig = true) {
  if (honorConfig) {
    return storage.cookiesAreEnabled() && appliedConfig.storage.type.includes('cookie');
  }
  return storage.cookiesAreEnabled();
}
/**
 * @param {boolean} honorConfig - false to override for reading or deleting old stored items
 * @returns {boolean} for whether we can write the cookie
 */
function localStorageIsEnabled(honorConfig = true) {
  if (honorConfig) {
    return storage.hasLocalStorage() && appliedConfig.storage.type.includes('html5');
  }
  return storage.hasLocalStorage();
}
/**
 * @param {SubmoduleConfig} config
 * @returns {null|string} - string error if it finds one, null otherwise.
 */
function checkConfigHasErrorsAndReport(config) {
  let error = null;
  if (typeof config.storage !== 'undefined') {
    Object.assign(appliedConfig.storage, appliedConfig.storage, config.storage);
    const READABLE_MODULE_NAME = 'Lotame ID module';
    const PERMITTED_STORAGE_TYPES = ['cookie', 'html5', 'cookie&html5'];
    if (typeof config.storage.name !== 'undefined' && config.storage.name !== KEY_ID) {
      logError(`Misconfigured ${READABLE_MODULE_NAME}, "storage.name" is expected to be "${KEY_ID}", actual is "${config.storage.name}"`);
      error = true;
    } else if (config.storage.type !== 'undefined' && !PERMITTED_STORAGE_TYPES.includes(config.storage.type)) {
      logError(`Misconfigured ${READABLE_MODULE_NAME}, "storage.type" is expected to be one of "${PERMITTED_STORAGE_TYPES.join(', ')}", actual is "${config.storage.type}"`);
    }
  }
  return error;
}
/** @type {Submodule} */
export const lotamePanoramaIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Vendor id of Lotame
   * @type {Number}
   */
  gvlid: GVLID,

  /**
   * Decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    return isStr(value) ? { lotamePanoramaId: value } : undefined;
  },

  /**
   * Retrieve the Lotame Panorama Id
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    if (checkConfigHasErrorsAndReport(config)) {
      return;
    }
    cookieDomain = lotamePanoramaIdSubmodule.findRootDomain();
    const configParams = (config && config.params) || {};
    const clientId = configParams.clientId;
    const hasCustomClientId = !isEmpty(clientId);
    const localCache = getLotameLocalCache(clientId);

    const hasExpiredPanoId = Date.now() > localCache.expiryTimestampMs;

    if (hasCustomClientId) {
      const hasFreshClientNoConsent = Date.now() < localCache.clientExpiryTimestampMs;
      if (hasFreshClientNoConsent) {
        // There is no consent
        return {
          id: undefined,
          reason: 'NO_CLIENT_CONSENT',
        };
      }
    }

    if (!hasExpiredPanoId) {
      return {
        id: localCache.data,
      };
    }

    const storedUserId = getProfileId();

    const getRequestHost = function() {
      if (navigator.userAgent && navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1) {
        return ID_HOST_COOKIELESS;
      }
      return ID_HOST;
    }

    const resolveIdFunction = function (callback) {
      const queryParams = {};
      if (storedUserId) {
        queryParams.fp = storedUserId;
      }

      let consentString;
      if (consentData) {
        if (isBoolean(consentData.gdpr?.gdprApplies)) {
          queryParams.gdpr_applies = consentData.gdpr.gdprApplies;
        }
        consentString = consentData.gdpr?.consentString;
      }
      if (consentString) {
        queryParams.gdpr_consent = consentString;
      }

      // Add clientId to the url
      if (hasCustomClientId) {
        queryParams.c = clientId;
      }

      const url = buildUrl({
        protocol: 'https',
        host: getRequestHost(),
        pathname: '/id',
        search: isEmpty(queryParams) ? undefined : queryParams,
      });
      ajax(
        url,
        (response) => {
          let coreId;
          if (response) {
            try {
              const responseObj = JSON.parse(response);
              const hasNoConsentErrors = !(
                isArray(responseObj.errors) &&
                responseObj.errors.indexOf(MISSING_CORE_CONSENT) !== -1
              );

              if (hasCustomClientId) {
                if (hasNoConsentErrors) {
                  clearLotameCache(`${KEY_EXPIRY}_${clientId}`);
                } else if (isStr(responseObj.no_consent) && responseObj.no_consent === 'CLIENT') {
                  saveLotameCache(
                    `${KEY_EXPIRY}_${clientId}`,
                    responseObj.expiry_ts,
                    responseObj.expiry_ts
                  );

                  // End Processing
                  callback();
                  return;
                }
              }

              saveLotameCache(KEY_EXPIRY, responseObj.expiry_ts, responseObj.expiry_ts);

              if (isStr(responseObj.profile_id)) {
                if (hasNoConsentErrors) {
                  setProfileId(responseObj.profile_id);
                }

                if (isStr(responseObj.core_id)) {
                  saveLotameCache(
                    KEY_ID,
                    responseObj.core_id,
                    responseObj.expiry_ts
                  );
                  coreId = responseObj.core_id;
                } else {
                  clearLotameCache(KEY_ID);
                }
              } else {
                if (hasNoConsentErrors) {
                  clearLotameCache(KEY_PROFILE);
                }
                clearLotameCache(KEY_ID);
              }
            } catch (error) {
              logError(error);
            }
          }
          callback(coreId);
        },
        undefined,
        {
          method: 'GET',
          withCredentials: true,
        }
      );
    };

    return { callback: resolveIdFunction };
  },
  eids: {
    lotamePanoramaId: {
      source: 'crwdcntrl.net',
      atype: 1,
    },
  },
};

submodule('userId', lotamePanoramaIdSubmodule);
