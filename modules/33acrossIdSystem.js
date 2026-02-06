/**
 * This module adds 33acrossId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/33acrossIdSystem
 * @requires module:modules/userId
 */

import { logMessage, logError, logWarn } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler } from '../src/adapterManager.js';
import { getStorageManager, STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { domainOverrideToRootDomain } from '../libraries/domainOverrideToRootDomain/index.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = '33acrossId';
const API_URL = 'https://lexicon.33across.com/v1/envelope';
const AJAX_TIMEOUT = 10000;
const CALLER_NAME = 'pbjs';
const GVLID = 58;

const STORAGE_FPID_KEY = '33acrossIdFp';
const STORAGE_TPID_KEY = '33acrossIdTp';
const STORAGE_HEM_KEY = '33acrossIdHm'
const DEFAULT_1PID_SUPPORT = true;
const DEFAULT_TPID_SUPPORT = true;

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

export const domainUtils = {
  domainOverride: domainOverrideToRootDomain(storage, MODULE_NAME)
};

function calculateResponseObj(response) {
  if (!response.succeeded) {
    if (response.error === 'Cookied User') {
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
    fp: response.data.fp,
    tp: response.data.tp
  };
}

function calculateQueryStringParams({ pid, pubProvidedHem }, gdprConsentData, enabledStorageTypes) {
  const uspString = uspDataHandler.getConsentData();
  const coppaValue = coppaDataHandler.getCoppa();
  const gppConsent = gppDataHandler.getConsentData();

  const params = {
    pid,
    gdpr: 0,
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

  const fp = getStoredValue(STORAGE_FPID_KEY, enabledStorageTypes);
  if (fp) {
    params.fp = encodeURIComponent(fp);
  }

  const tp = getStoredValue(STORAGE_TPID_KEY, enabledStorageTypes);
  if (tp) {
    params.tp = encodeURIComponent(tp);
  }

  const hem = pubProvidedHem || getStoredValue(STORAGE_HEM_KEY, enabledStorageTypes);
  if (hem) {
    params.sha256 = encodeURIComponent(hem);
  }

  return params;
}

function deleteFromStorage(key) {
  if (storage.cookiesAreEnabled()) {
    const expiredDate = new Date(0).toUTCString();

    storage.setCookie(key, '', expiredDate, 'Lax', domainUtils.domainOverride());
  }

  storage.removeDataFromLocalStorage(key);
}

function storeValue(key, value, { enabledStorageTypes, expires }) {
  enabledStorageTypes.forEach(storageType => {
    if (storageType === STORAGE_TYPE_COOKIES) {
      const expirationInMs = 60 * 60 * 24 * 1000 * expires;
      const expirationTime = new Date(Date.now() + expirationInMs);

      storage.setCookie(key, value, expirationTime.toUTCString(), 'Lax', domainUtils.domainOverride());
    } else if (storageType === STORAGE_TYPE_LOCALSTORAGE) {
      storage.setDataInLocalStorage(key, value);
    }
  });
}

function getStoredValue(key, enabledStorageTypes) {
  let storedValue;

  enabledStorageTypes.find(storageType => {
    if (storageType === STORAGE_TYPE_COOKIES) {
      storedValue = storage.getCookie(key);
    } else if (storageType === STORAGE_TYPE_LOCALSTORAGE) {
      storedValue = storage.getDataFromLocalStorage(key);
    }

    return !!storedValue;
  });

  return storedValue;
}

function filterEnabledSupplementalIds({ tp, fp, hem }, { storeFpid, storeTpid, envelopeAvailable }) {
  const ids = [];

  if (storeFpid) {
    ids.push(
      /**
       * [
       *   <storage key>,
       *   < ID value to store or remove >,
       *   < clear flag: indicates if existing storage item should be removed or not based on certain condition>
       * ]
       */
      [STORAGE_FPID_KEY, fp, !fp],
      [STORAGE_HEM_KEY, hem, !envelopeAvailable] // Clear hashed email if envelope is not available
    );
  }

  if (storeTpid) {
    ids.push([STORAGE_TPID_KEY, tp, !tp]);
  }

  return ids;
}

function updateSupplementalIdStorage(supplementalId, storageConfig) {
  const [ key, id, clear ] = supplementalId;

  if (clear) {
    deleteFromStorage(key);

    return;
  }

  if (id) {
    storeValue(key, id, storageConfig);
  }
}

function handleSupplementalIds(ids, { enabledStorageTypes, expires, ...options }) {
  filterEnabledSupplementalIds(ids, options).forEach((supplementalId) => {
    updateSupplementalIdStorage(supplementalId, {
      enabledStorageTypes,
      expires
    })
  });
}

/** @type {Submodule} */
export const thirtyThreeAcrossIdSubmodule = {
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
  getId({ params = { }, enabledStorageTypes = [], storage: storageConfig = {} }, {gdpr: gdprConsentData} = {}) {
    if (typeof params.pid !== 'string') {
      logError(`${MODULE_NAME}: Submodule requires a partner ID to be defined`);

      return;
    }

    if (gdprConsentData?.gdprApplies === true) {
      logWarn(`${MODULE_NAME}: Submodule cannot be used where GDPR applies`);

      return;
    }

    const {
      storeFpid = DEFAULT_1PID_SUPPORT,
      storeTpid = DEFAULT_TPID_SUPPORT, apiUrl = API_URL,
      pid,
      hem
    } = params;
    const pubProvidedHem = hem || window._33across?.hem?.sha256;

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

            if (!responseObj.envelope) {
              ['', '_last', '_exp', '_cst'].forEach(suffix => {
                deleteFromStorage(`${MODULE_NAME}${suffix}`);
              });
            }

            handleSupplementalIds({
              fp: responseObj.fp,
              tp: responseObj.tp,
              hem: pubProvidedHem
            }, {
              storeFpid,
              storeTpid,
              envelopeAvailable: !!responseObj.envelope,
              enabledStorageTypes,
              expires: storageConfig.expires
            });

            cb(responseObj.envelope);
          },
          error(err) {
            logError(`${MODULE_NAME}: ID error response`, err);

            cb();
          }
        }, calculateQueryStringParams({ pid, pubProvidedHem }, gdprConsentData, enabledStorageTypes), {
          method: 'GET',
          withCredentials: true
        });
      }
    };
  },
  domainOverride: domainUtils.domainOverride,
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

submodule('userId', thirtyThreeAcrossIdSubmodule);
