/**
 * This module adds Acxiom Real ID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/acxiomRealIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { logError, logInfo } from '../src/utils.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'acxiomRealId';
const DEFAULT_API_URL = 'https://ids.api.gcprivacy.id/e/l';
const DEFAULT_SOURCE_ID = 'acxiom.id';
const LOG_PREFIX = 'AcxiomRealId: ';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

function isConsentBlocked(consentData) {
  if (!consentData) {
    return false;
  }

  // EU/UK passive suppression: TCF string present → do not fire
  const gdpr = consentData.gdpr;
  if (gdpr && (gdpr.gdprApplies || gdpr.consentString)) {
    logInfo(LOG_PREFIX + 'TCF consent string detected, suppressing.');
    return true;
  }

  // CCPA: us_privacy position 3 = Y → opted out of sale
  const usp = consentData.usp;
  if (usp && typeof usp === 'string' && usp.length >= 3 && usp.charAt(2) === 'Y') {
    logInfo(LOG_PREFIX + 'CCPA opt-out detected, suppressing.');
    return true;
  }

  return false;
}

function deleteStoredToken(config) {
  const storageName = (config && config.storage && config.storage.name) || MODULE_NAME;
  if (storage.localStorageIsEnabled()) {
    storage.removeDataFromLocalStorage(storageName);
  }
  if (storage.cookiesAreEnabled()) {
    storage.setCookie(storageName, '', new Date(0).toUTCString());
  }
  logInfo(LOG_PREFIX + 'Stored token deleted.');
}

function buildLookupUrl(apiUrl) {
  return (apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
}

/** @type {Submodule} */
export const acxiomRealIdSubmodule = {
  name: MODULE_NAME,

  decode(value) {
    if (value && typeof value === 'object' && value.id) {
      return { acxiomRealId: value };
    }
    if (value && typeof value === 'string') {
      return { acxiomRealId: { id: value, atype: 1 } };
    }
    return undefined;
  },

  getId(config, consentData) {
    const configParams = (config && config.params) || {};
    const { partnerId, apiUrl, sourceId, hem } = configParams;

    if (!partnerId) {
      logError(LOG_PREFIX + 'partnerId is required.');
      return undefined;
    }

    if (isConsentBlocked(consentData)) {
      deleteStoredToken(config);
      return undefined;
    }

    const url = buildLookupUrl(apiUrl);
    const payload = {
      partnerId,
      ip: '',
      userAgent: navigator.userAgent,
      sourceId: sourceId || DEFAULT_SOURCE_ID
    };
    if (hem) {
      payload.hem = hem;
    }
    const body = JSON.stringify(payload);

    return {
      callback: (cb) => {
        const ajax = ajaxBuilder();
        ajax(
          url,
          {
            success: (response) => {
              try {
                const parsed = JSON.parse(response);
                const eids = parsed && parsed.user && parsed.user.eids;
                const uid = eids && eids[0] && eids[0].uids && eids[0].uids[0];
                if (uid && uid.id) {
                  cb({ id: uid.id, atype: uid.atype });
                } else {
                  cb();
                }
              } catch (e) {
                logError(LOG_PREFIX + 'Failed to parse response.', e);
                cb();
              }
            },
            error: () => {
              logError(LOG_PREFIX + 'Lookup request failed.');
              cb();
            }
          },
          body,
          {
            method: 'POST',
            contentType: 'application/json',
            withCredentials: true
          }
        );
      }
    };
  },

  onDataDeletionRequest(config) {
    deleteStoredToken(config);
  },

  eids: {
    'acxiomRealId': (values) => {
      return values.map(data => ({
        source: DEFAULT_SOURCE_ID,
        uids: [{ id: data.id, atype: data.atype }]
      }));
    }
  }
};

submodule('userId', acxiomRealIdSubmodule);
