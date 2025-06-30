import { submodule } from '../src/hook.js';
import { cleanObj, getWindowTop, isFn, logError, logInfo, logWarn, mergeDeep } from '../src/utils.js';
import { getStorageManager } from "../src/storageManager.js";
import { MODULE_TYPE_RTD } from "../src/activities/modules.js";

const MODULE_NAME = 'adlane';
const LOCAL_STORAGE_KEY = 'ageVerification';

/**
 * @typedef {Object} AgeVerification
 * @property {string} id - The unique identifier for the age verification.
 * @property {string} status - The status of the age verification.
 * @property {string} decisionDate - The date when the age verification decision was made.
 */

/**
 * Creates a storage manager for the adlane module.
 * @returns {Object} The storage manager object.
 */
function createStorage() {
  return getStorageManager({
    moduleType: MODULE_TYPE_RTD,
    moduleName: MODULE_NAME
  });
}

/**
 * Checks if the AdlCmp is available in the given window.
 * @param {Window} windowTop - The top-level window object.
 * @returns {boolean} True if AdlCmp is available, false otherwise.
 */
export function isAdlCmpAvailable(windowTop) {
  return !!(
    typeof windowTop !== 'undefined' &&
    windowTop.AdlCmp &&
    isFn(windowTop.AdlCmp.getAgeVerification)
  );
}

/**
 * Retrieves age verification data from local storage.
 * @param {Object} storage - The storage manager object.
 * @returns {AgeVerification|null} The age verification data if available, null otherwise.
 */
export function getAgeVerificationByLocalStorage(storage) {
  const storedAgeVerification = storage.getDataFromLocalStorage(LOCAL_STORAGE_KEY);

  if (!storedAgeVerification) return null;

  try {
    const parseAgeVerification = JSON.parse(storedAgeVerification);

    if (parseAgeVerification?.status) {
      const { status, id, decisionDate } = parseAgeVerification;

      return { id, status, decisionDate };
    }
  } catch (e) {
    logError('Error parsing stored age verification:', e);
  }
  return null;
}

/**
 * Retrieves age verification data from AdlCmp or local storage.
 * @param {Window} windowTop - The top-level window object.
 * @param {Object} storage - The storage manager object.
 * @returns {AgeVerification|null} The age verification data if available, null otherwise.
 */
export function getAgeVerification(windowTop, storage) {
  if (isAdlCmpAvailable(windowTop)) {
    const adlCmpAgeVerification = windowTop.AdlCmp.getAgeVerification();

    if (adlCmpAgeVerification?.status) {
      const { status, id, decisionDate } = adlCmpAgeVerification;

      return cleanObj({ id, status, decisionDate });
    }
  }

  logInfo('Failed to get age verification from AdlCmp, trying localStorage');

  const ageVerificationFromStorage = getAgeVerificationByLocalStorage(storage);

  return ageVerificationFromStorage ? cleanObj(ageVerificationFromStorage) : null;
}

/**
 * Sets the age verification configuration in the provided config object.
 * @param {Object} config - The configuration object to update.
 * @param {AgeVerification} ageVerification - The age verification data to set.
 */
export function setAgeVerificationConfig(config, ageVerification) {
  try {
    const newConfig = {
      regs: { ext: { age_verification: ageVerification } }
    };

    mergeDeep(config.ortb2Fragments.global, newConfig);
  } catch (e) {
    logError('Failed to merge age verification config', e);
  }
}

/**
 * Initializes the adlane module.
 * @returns {boolean} True if initialization was successful, false otherwise.
 */
function init() {
  const windowTop = getWindowTop();
  const storage = createStorage();

  if (isAdlCmpAvailable(windowTop)) {
    logInfo('adlaneSubmodule initialized with AdlCmp');

    return true;
  }

  if (storage.hasLocalStorage() && storage.getDataFromLocalStorage(LOCAL_STORAGE_KEY)) {
    logInfo('adlaneSubmodule initialized with localStorage data');

    return true;
  }

  logWarn('adlaneSubmodule initialization failed: Neither AdlCmp nor localStorage data available');

  return false;
}

/**
 * Alters bid requests by adding age verification data.
 * @param {Object} reqBidsConfigObj - The bid request configuration object.
 * @param {Function} callback - The callback function to call after altering the bid requests.
 */
function alterBidRequests(reqBidsConfigObj, callback) {
  const windowTop = getWindowTop();
  const storage = createStorage();

  try {
    const ageVerification = getAgeVerification(windowTop, storage);

    if (ageVerification) {
      setAgeVerificationConfig(reqBidsConfigObj, ageVerification);
    }
  } catch (error) {
    logError('Error in adlaneRtdProvider onAuctionInit', error);
  }
  callback();
}

/**
 * The adlane submodule object.
 * @type {Object}
 */
export const adlaneSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData: alterBidRequests
};

submodule('realTimeData', adlaneSubmodule);
