import { submodule } from '../src/hook.js';
import { cleanObj, getWindowTop, isFn, logError, logInfo, logWarn } from '../src/utils.js';
import { getStorageManager } from "../src/storageManager.js";
import { MODULE_TYPE_RTD } from "../src/activities/modules.js";
import { config as sourceConfig } from '../src/config.js';

const MODULE_NAME = 'adlineRtd';
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
      const { status, consentId, decisionDate, dob } = parsedAgeConsent;
      return { id: consentId, status, decisionDate, dob };
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
      const { status, consentId, decisionDate, dob } = adlCmpConsent;
      return cleanObj({ id: consentId, status, decisionDate, dob });
    }
  }

  logInfo('Failed to get age consent from AdlCmp, trying localStorage');

  const consentFromStorage = getAgeConsentByLocalStorage(storage);

  return consentFromStorage ? cleanObj(consentFromStorage) : null;
}

export function setAgeConsentConfig(ageConsent) {
  try {
    const newConfig = {
      ortb2: {
        user: { ext: { age_consent: ageConsent } }
      }
    };
    sourceConfig.mergeConfig(newConfig);
  } catch (e) {
    logError('Failed to merge ageConsent config', e);
  }
}

function init() {
  const windowTop = getWindowTop();
  const storage = createStorage();
  if (isAdlCmpAvailable(windowTop)) {
    logInfo('adlineSubmodule initialized with AdlCmp');
    return true;
  }

  if (storage.hasLocalStorage() && storage.getDataFromLocalStorage(LOCAL_STORAGE_KEY)) {
    logInfo('adlineSubmodule initialized with localStorage data');
    return true;
  }

  logWarn('adlineSubmodule initialization failed: Neither AdlCmp nor localStorage data available');
  return false;
}

function onAuctionInit() {
  const windowTop = getWindowTop();
  const storage = createStorage();

  try {
    const ageConsent = getAgeConsent(windowTop, storage);
    if (ageConsent) {
      setAgeConsentConfig(ageConsent);
    }
  } catch (error) {
    logError('Error in adlineRtdProvider onAuctionInit', error);
  }
}

export const adlineSubmodule = {
  name: MODULE_NAME,
  init,
  onAuctionInitEvent: onAuctionInit
};

submodule('realTimeData', adlineSubmodule);
