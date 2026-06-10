import { logError, logInfo } from '../../src/utils.js';
import { SUPPORTED_TYPES, FIRST_PARTY_KEY } from '../../libraries/intentIqConstants/intentIqConstants.js';
import { getStorageManager } from '../../src/storageManager.js';
import { MODULE_TYPE_UID } from '../../src/activities/modules.js';

const MODULE_NAME = 'intentIqId';
const PCID_EXPIRY = 365;

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

/**
 * Detects partner-data keys of the form `_iiq_fdata_<partnerId>`.
 * @param {string} key
 * @returns {boolean}
 */
export function isPartnerDataKey(key) {
  if (typeof key !== 'string') return false;
  const parts = key.split('_fdata_');
  if (parts.length < 2) return false;
  const partnerId = parts[1];
  return !!partnerId && !Number.isNaN(Number(partnerId));
}

/**
 * Read data from local storage or cookie based on allowed storage types.
 * @param {string} key - The key to read data from.
 * @param {Array} allowedStorage - Array of allowed storage types ('html5' or 'cookie').
 * @return {string|null} - The retrieved data or null if an error occurs.
 */
export function readData(key, allowedStorage) {
  try {
    if (storage.hasLocalStorage() && allowedStorage.includes('html5')) {
      return storage.getDataFromLocalStorage(key);
    }
    if (storage.cookiesAreEnabled() && allowedStorage.includes('cookie')) {
      return storage.getCookie(key);
    }
  } catch (error) {
    logError(`${MODULE_NAME}: Error reading data`, error);
  }
  return null;
}

/**
 * Store Intent IQ data in cookie, local storage or both of them
 * expiration date: 365 days
 * @param {string} key - The key under which the data will be stored.
 * @param {string} value - The value to be stored (e.g., IntentIQ ID).
 * @param {Array} allowedStorage - An array of allowed storage types: 'html5' for Local Storage and/or 'cookie' for Cookies.
 * @param {Object} firstPartyData - Contains user consent data; when isOptedOut is true only a stripped subset is persisted to device.
 */
export function storeData(key, value, allowedStorage, firstPartyData) {
  try {
    if (firstPartyData?.isOptedOut) {
      // Limit what reaches device storage when the user is opted out.
      // - FIRST_PARTY_KEY: drop identifiers (pcid, pcidDate, pid, abTestUuid). Keep gdprString/isOptedOut/sCal etc.
      // - Partner data (_iiq_fdata_<partnerId>): persist only terminationCause.
      // - Anything else: do not persist.
      if (key === FIRST_PARTY_KEY) {
        const parsed = typeof value === 'string' ? tryParse(value) : (value && typeof value === 'object' ? { ...value } : null);
        if (parsed) {
          delete parsed.pcid;
          delete parsed.pcidDate;
          delete parsed.pid;
          delete parsed.abTestUuid;
          value = JSON.stringify(parsed);
        }
      } else if (isPartnerDataKey(key)) {
        const parsed = typeof value === 'string' ? tryParse(value) : (value && typeof value === 'object' ? value : null);
        value = JSON.stringify({ terminationCause: parsed ? parsed.terminationCause : undefined });
      } else {
        return;
      }
    }
    logInfo(MODULE_NAME + ': storing data: key=' + key + ' value=' + value);
    if (value) {
      if (storage.hasLocalStorage() && allowedStorage.includes('html5')) {
        storage.setDataInLocalStorage(key, value);
      }
      if (storage.cookiesAreEnabled() && allowedStorage.includes('cookie')) {
        const expiresStr = (new Date(Date.now() + (PCID_EXPIRY * (60 * 60 * 24 * 1000)))).toUTCString();
        storage.setCookie(key, value, expiresStr, 'LAX');
      }
    }
  } catch (error) {
    logError(error);
  }
}

/**
 * Remove Intent IQ data from cookie or local storage
 * @param key
 */

export function removeDataByKey(key, allowedStorage) {
  try {
    if (storage.hasLocalStorage() && allowedStorage.includes('html5')) {
      storage.removeDataFromLocalStorage(key);
    }
    if (storage.cookiesAreEnabled() && allowedStorage.includes('cookie')) {
      const expiredDate = new Date(0).toUTCString();
      storage.setCookie(key, '', expiredDate, 'LAX');
    }
  } catch (error) {
    logError(error);
  }
}

/**
 * Determines the allowed storage types based on provided parameters.
 * If no valid storage types are provided, it defaults to 'html5'.
 *
 * @param {Array<string>} params - An array containing storage type preferences, e.g., ['html5', 'cookie'].
 * @return {Array<string>} - Returns an array with allowed storage types. Defaults to ['html5'] if no valid options are provided.
 */
export function defineStorageType(params) {
  if (!params || !Array.isArray(params)) return ['html5']; // use locale storage be default
  const filteredArr = params.filter(item => SUPPORTED_TYPES.includes(item));
  return filteredArr.length ? filteredArr : ['html5'];
}

/**
 * Parse json if possible, else return null
 * @param data
 */
export function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(err);
    return null;
  }
}
