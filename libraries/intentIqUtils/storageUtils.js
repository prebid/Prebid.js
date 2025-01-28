import {logError} from '../../src/utils.js';
import {SUPPORTED_TYPES} from '../../libraries/intentIqConstants/intentIqConstants.js';

const MODULE_NAME = 'intentIqId';

/**
 * Read data from local storage or cookie based on allowed storage types.
 * @param {string} key - The key to read data from.
 * @param {Array} allowedStorage - Array of allowed storage types ('html5' or 'cookie').
 * @return {string|null} - The retrieved data or null if an error occurs.
 */
export function readData(key, allowedStorage, storage) {
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
