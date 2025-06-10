import { submodule } from '../src/hook.js';
import { cleanObj, getWindowTop, isFn, logError, logInfo, logWarn, mergeDeep } from '../src/utils.js';
import { getStorageManager } from "../src/storageManager.js";
import { MODULE_TYPE_RTD } from "../src/activities/modules.js";

const MODULE_NAME = 'adlaneRtd';
const LOCAL_STORAGE_KEY = 'ageConsent';

function createStorage() {
  return getStorageManager({
    moduleType: MODULE_TYPE_RTD,
    moduleName: MODULE_NAME
  });
}

export function isAdlCmpAvailable(windowTop) {
  return !!(
    typeof windowTop !== 'undefined' &&
    windowTop.AdlCmp &&
    isFn(windowTop.AdlCmp.getAgeConsent)
  );
}

export function getAgeConsentByLocalStorage(storage) {
  const storedAgeConsent = storage.getDataFromLocalStorage(LOCAL_STORAGE_KEY);

  if (!storedAgeConsent) return null;

  try {
    const parsedAgeConsent = JSON.parse(storedAgeConsent);
    if (parsedAgeConsent && 'status' in parsedAgeConsent && parsedAgeConsent.status) {
      const { status, consentId, decisionDate } = parsedAgeConsent;
      return { id: consentId, status, decisionDate };
    }
  } catch (e) {
    logError('Error parsing stored age consent:', e);
  }
  return null;
}

export function getAgeConsent(windowTop, storage) {
  if (isAdlCmpAvailable(windowTop)) {
    const adlCmpConsent = windowTop.AdlCmp.getAgeConsent();

    if (adlCmpConsent && adlCmpConsent.status) {
      const { status, consentId, decisionDate } = adlCmpConsent;
      return cleanObj({ id: consentId, status, decisionDate });
    }
  }

  logInfo('Failed to get age consent from AdlCmp, trying localStorage');

  const consentFromStorage = getAgeConsentByLocalStorage(storage);

  return consentFromStorage ? cleanObj(consentFromStorage) : null;
}

export function setAgeConsentConfig(config, ageConsent) {
  try {
    const newConfig = {
      user: { ext: { age_consent: ageConsent } }
    };
    mergeDeep(config.ortb2Fragments.global, newConfig);
  } catch (e) {
    logError('Failed to merge ageConsent config', e);
  }
}

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

function alterBidRequests(reqBidsConfigObj, callback) {
  const windowTop = getWindowTop();
  const storage = createStorage();

  try {
    const ageConsent = getAgeConsent(windowTop, storage);
    if (ageConsent) {
      setAgeConsentConfig(reqBidsConfigObj, ageConsent);
    }
  } catch (error) {
    logError('Error in adlaneRtdProvider onAuctionInit', error);
  }
  callback();
}

export const adlaneSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData: alterBidRequests
};

submodule('realTimeData', adlaneSubmodule);
