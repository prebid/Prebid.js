import { logInfo, logError, isStr, isEmptyStr } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler, gdprDataHandler } from '../src/adapterManager.js';

const MODULE_NAME = 'pubmaticId';
const GVLID = 76;
export const STORAGE_NAME = 'pubmaticId';
const STORAGE_EXPIRES = 30; // days
const STORAGE_REFRESH_IN_SECONDS = 24 * 3600; // 24 Hours
const LOG_PREFIX = 'PubMatic User ID: ';
const VERSION = '1';
const API_URL = 'https://image6.pubmatic.com/AdServer/UCookieSetPug?oid=5&p=';

function generateQueryStringParams(config) {
  const uspString = uspDataHandler.getConsentData();
  const coppaValue = coppaDataHandler.getCoppa();
  const gppConsent = gppDataHandler.getConsentData();
  const gdprConsent = gdprDataHandler.getConsentData();

  const params = {
    publisherId: String(config.params.publisherId || '').trim(),
    gdpr: (gdprConsent && gdprConsent?.gdprApplies) ? 1 : 0,
    gdpr_consent: gdprConsent && gdprConsent?.consentString ? encodeURIComponent(gdprConsent.consentString) : '',
    src: 'pbjs_uid',
    ver: VERSION,
    coppa: Number(coppaValue),
    us_privacy: uspString ? encodeURIComponent(uspString) : '',
    gpp: gppConsent?.gppString ? encodeURIComponent(gppConsent.gppString) : '',
    gpp_sid: gppConsent?.applicableSections?.length ? encodeURIComponent(gppConsent.applicableSections.join(',')) : ''
  };

  return params;
}

function buildUrl(config) {
  let baseUrl = `${API_URL}${config.params.publisherId}`;
  const params = generateQueryStringParams(config);

  Object.keys(params).forEach((key) => {
    baseUrl += `&${key}=${params[key]}`;
  });

  return baseUrl;
}

function getSuccessAndErrorHandler(callback, handle) {
  return {
    success: (response) => {
      let responseObj;

      try {
        responseObj = JSON.parse(response);
        logInfo(LOG_PREFIX + 'response received from the server', responseObj);
      } catch (error) {}

      if (responseObj && isStr(responseObj.id) && !isEmptyStr(responseObj.id)) {
        callback(responseObj);
      } else {
        handle.remove();
        callback();
      }
    },
    error: (error) => {
      handle.remove();
      logError(LOG_PREFIX + 'getId fetch encountered an error', error);
      callback();
    }
  };
}

function hasRequiredConfig(config) {
  if (!config || !config.storage || !config.params) {
    logError(LOG_PREFIX + 'config.storage and config.params should be passed.');
    return false;
  }

  // convert publisherId to string and trim
  if (config.params.publisherId) {
    config.params.publisherId = String(config.params.publisherId).trim();
  }

  if (!config.params.publisherId) {
    logError(LOG_PREFIX + 'config.params.publisherId should be provided.');
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
    if (isStr(value.id) && !isEmptyStr(value.id)) {
      return { pubmaticId: value.id };
    }
    return undefined;
  },
  getId(config, consentData, storedId, handle) {
    if (!hasRequiredConfig(config)) {
      return undefined;
    }

    const resp = (callback) => {
      logInfo(LOG_PREFIX + 'requesting an ID from the server');
      const url = buildUrl(config);
      ajax(url, getSuccessAndErrorHandler(callback, handle), null, {
        method: 'GET',
        withCredentials: true,
      });
    };

    return { callback: resp };
  },
  eids: {
    'pubmaticId': {
      source: 'esp.pubmatic.com',
      atype: 1,
      getValue: (data) => {
        return data;
      }
    },
  }
};

submodule('userId', pubmaticIdSubmodule);
