/**
 * This module adds 33acrossId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/33acrossIdSystem
 * @requires module:modules/userId
 */

import { logMessage, logError } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler } from '../src/adapterManager.js';
import { getStorageManager, STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = '33acrossId';
const API_URL = 'https://lexicon.33across.com/v1/envelope';
const AJAX_TIMEOUT = 10000;
const CALLER_NAME = 'pbjs';
const GVLID = 58;

const STORAGE_FPID_KEY = '33acrossIdFp';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

function calculateResponseObj(response) {
  if (!response.succeeded) {
    if (response.error == 'Cookied User') {
      logMessage(`${MODULE_NAME}: Unsuccessful response`.concat(' ', response.error));
    } else {
      logError(`${MODULE_NAME}: Unsuccessful response`.concat(' ', response.error));
    }
    return {};
  }

  if (!response.data.envelope) {
    logMessage(`${MODULE_NAME}: No envelope was received`);

    return {};
  }

  return {
    envelope: response.data.envelope,
    fp: response.data.fp
  };
}

function calculateQueryStringParams(pid, gdprConsentData, storageConfig) {
  const uspString = uspDataHandler.getConsentData();
  const gdprApplies = Boolean(gdprConsentData?.gdprApplies);
  const coppaValue = coppaDataHandler.getCoppa();
  const gppConsent = gppDataHandler.getConsentData();

  const params = {
    pid,
    gdpr: Number(gdprApplies),
    src: CALLER_NAME,
    ver: '$prebid.version$',
    coppa: Number(coppaValue)
  };

  if (uspString) {
    params.us_privacy = uspString;
  }

  if (gppConsent) {
    const { gppString = '', applicableSections = [] } = gppConsent;

    params.gpp = gppString;
    params.gpp_sid = encodeURIComponent(applicableSections.join(','))
  }

  if (gdprConsentData?.consentString) {
    params.gdpr_consent = gdprConsentData.consentString;
  }

  const fp = getStoredValue(STORAGE_FPID_KEY, storageConfig);
  if (fp) {
    params.fp = fp;
  }

  return params;
}

function handleFpId(fpId, storageConfig = {}) {
  if (!fpId) {
    return storage.removeDataFromLocalStorage(STORAGE_FPID_KEY);
  }

  storeValue(STORAGE_FPID_KEY, fpId, storageConfig);
}

function storeValue(key, value, storageConfig = {}) {
  if (storageConfig.type === STORAGE_TYPE_COOKIES && storage.cookiesAreEnabled()) {
    const expirationInMs = 60 * 60 * 24 * 1000 * storageConfig.expires;
    const expirationTime = new Date(Date.now() + expirationInMs);

    storage.setCookie(key, value, expirationTime.toUTCString(), 'Lax');
  } else if (storageConfig.type === STORAGE_TYPE_LOCALSTORAGE) {
    storage.setDataInLocalStorage(key, value);
  }
}

function getStoredValue(key, storageConfig = {}) {
  if (storageConfig.type === STORAGE_TYPE_COOKIES && storage.cookiesAreEnabled()) {
    return storage.getCookie(key);
  } else if (storageConfig.type === STORAGE_TYPE_LOCALSTORAGE) {
    return storage.getDataFromLocalStorage(key);
  }
}

/** @type {Submodule} */
export const thirthyThreeAcrossIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  gvlid: GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} id
   * @returns {{'33acrossId':{ envelope: string}}}
   */
  decode(id) {
    return {
      [MODULE_NAME]: {
        envelope: id
      }
    };
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId({ params = { }, storage }, gdprConsentData) {
    if (typeof params.pid !== 'string') {
      logError(`${MODULE_NAME}: Submodule requires a partner ID to be defined`);

      return;
    }

    const { pid, apiUrl = API_URL } = params;

    return {
      callback(cb) {
        ajaxBuilder(AJAX_TIMEOUT)(apiUrl, {
          success(response) {
            let responseObj = { };

            try {
              responseObj = calculateResponseObj(JSON.parse(response));
            } catch (err) {
              logError(`${MODULE_NAME}: ID reading error:`, err);
            }

            handleFpId(responseObj.fp, storage);

            cb(responseObj.envelope);
          },
          error(err) {
            logError(`${MODULE_NAME}: ID error response`, err);

            cb();
          }
        }, calculateQueryStringParams(pid, gdprConsentData, storage), { method: 'GET', withCredentials: true });
      }
    };
  },
  eids: {
    '33acrossId': {
      source: '33across.com',
      atype: 1,
      getValue: function(data) {
        return data.envelope;
      }
    },
  }
};

submodule('userId', thirthyThreeAcrossIdSubmodule);
