import { logInfo, logError, isNumber, isStr, isEmptyStr } from '../src/utils.js';
// logWarn, isEmpty
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
// import { getStorageManager, STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE } from '../src/storageManager.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler } from '../src/adapterManager.js';

// eslint-disable-next-line no-console
console.log('pubmaticIdSystem.js was loaded');

const MODULE_NAME = 'pubmaticId';
const GVLID = 76;
export const STORAGE_NAME = 'pubmaticId';
const STORAGE_EXPIRES = 30; // days
const STORAGE_REFRESH_IN_SECONDS = 24 * 3600; // 24 Hours
// const STORAGE_REFRESH_IN_SECONDS = 30; // 24 Hours
const LOG_PREFIX = 'PubMatic User ID: ';
const VERSION = '1';
const API_URL = 'https://image6.pubmatic.com/AdServer/UCookieSetPug?oid=5&p=';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

function generateQueryStringParams(config, consentData) {
  // eslint-disable-next-line no-console
  console.log('generateQueryStringParams invoked', { config, consentData });
  const uspString = uspDataHandler.getConsentData();
  const coppaValue = coppaDataHandler.getCoppa();
  const gppConsent = gppDataHandler.getConsentData();

  const params = {
    publisherId: config.params.publisherId,
    // gdpr: (consentData && consentData.gdpr && consentData.gdpr.gdprApplies) ? 1 : 0,
    gdpr: (consentData && consentData?.gdprApplies) ? 1 : 0,
    src: MODULE_NAME,
    ver: VERSION,
    coppa: Number(coppaValue)
  };

  // if (consentData?.gdpr?.consentString) {
  if (consentData && consentData?.consentString) {
    params.gdpr_consent = encodeURIComponent(consentData.consentString);
  }

  if (uspString) {
    params.us_privacy = encodeURIComponent(uspString);
  }

  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    params.gpp = encodeURIComponent(gppConsent.gppString);
    params.gpp_sid = encodeURIComponent(gppConsent.applicableSections.join(','));
  }

  // eslint-disable-next-line no-console
  console.log('generateQueryStringParams', { config, consentData, uspString, coppaValue, gppConsent, params });

  return params;
}

function buildUrl(config, consentData) {
  // eslint-disable-next-line no-console
  console.log('buildUrl invoked', { config, consentData });
  let baseUrl = `${API_URL}${config.params.publisherId}`;
  const params = generateQueryStringParams(config, consentData);

  Object.keys(params).forEach((key) => {
    baseUrl += `&${key}=${params[key]}`;
  });

  // eslint-disable-next-line no-console
  console.log('buildUrl', { config, consentData, baseUrl, params });

  return baseUrl;
}

function getSuccessAndErrorHandler(callback) {
  // eslint-disable-next-line no-console
  console.log('getSuccessAndErrorHandler invoked', { callback });
  return {
    success: (response) => {
      // eslint-disable-next-line no-console
      console.log('success invoked', { response });
      let responseObj;
      try {
        if (response) {
          responseObj = JSON.parse(response);
          // responseObj = {id: '720B2F5E-6E41-45A6-A3ED-C42EF6231AFB'};
          logInfo(LOG_PREFIX + 'response received from the server', responseObj);
          if (isStr(responseObj.id) && !isEmptyStr(responseObj.id)) {
            callback(responseObj);
          } else {
            callback();
          }
        } else {
          callback();
        }
        // eslint-disable-next-line no-console
        console.log('success', { callback, response, responseObj });
      } catch (error) {
        logError(LOG_PREFIX + 'ID reading error:', error);
        callback();
        // eslint-disable-next-line no-console
        console.log('success', { callback, response, responseObj, error });
      }
    },
    error: (error) => {
      // eslint-disable-next-line no-console
      console.log('error invoked', { callback, error });
      logError(LOG_PREFIX + 'getId fetch encountered an error', error);
      callback();
    }
  };
}

function hasRequiredConfig(config) {
  // eslint-disable-next-line no-console
  console.log('hasRequiredConfig invoked', { config });

  if (!config || !config.storage || !config.params) {
    logError(LOG_PREFIX + 'config.storage and config.params should be passed.');
    return false;
  }

  if (!isNumber(config.params.publisherId)) {
    logError(LOG_PREFIX + 'config.params.publisherId (int) should be provided.');
    return false;
  }

  if (config.storage.name !== STORAGE_NAME) {
    logError(LOG_PREFIX + `config.storage.name should be '${STORAGE_NAME}'.`);
    return false;
  }

  if (config.storage.expires !== STORAGE_EXPIRES) {
    logError(LOG_PREFIX + `config.storage.expires should be ${STORAGE_EXPIRES}.`);
    return false;
  }

  if (config.storage.refreshInSeconds !== STORAGE_REFRESH_IN_SECONDS) {
    logError(LOG_PREFIX + `config.storage.refreshInSeconds should be ${STORAGE_REFRESH_IN_SECONDS}.`);
    return false;
  }

  return true;
}

export const pubmaticIdSubmodule = {
  name: MODULE_NAME,
  gvlid: GVLID,
  decode(value) {
    // eslint-disable-next-line no-console
    console.log('decode invoked', { value });

    if (isStr(value.id) && !isEmptyStr(value.id)) {
      return { pubmaticId: value.id };
    }
    return undefined;
  },
  getId(config, consentData) {
    // eslint-disable-next-line no-console
    console.log('getId invoked', { config, consentData });

    if (!hasRequiredConfig(config)) {
      return undefined;
    }

    const resp = (callback) => {
      // eslint-disable-next-line no-console
      console.log('resp invoked', { callback });
      logInfo(LOG_PREFIX + 'requesting an ID from the server');
      const url = buildUrl(config, consentData);
      // eslint-disable-next-line no-console
      console.log('resp', { callback, url });
      ajax(url, getSuccessAndErrorHandler(callback), null, {
        method: 'GET',
        withCredentials: true,

        // method: 'POST',
        // contentType: 'application/json'
      });
    };

    return { callback: resp };
  },
  eids: {
    'pubmaticId': {
      source: 'esp.pubmatic.com',
      atype: 1
    },
  }
};

submodule('userId', pubmaticIdSubmodule);
