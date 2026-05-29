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
import { logError, getWindowSelf } from '../src/utils.js';
import { gdprDataHandler, uspDataHandler, gppDataHandler } from '../src/adapterManager.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

/**
 * @typedef {Object} AcxiomRealIdParams
 * @property {string} partnerId - Partner ID issued by GrowthCode on behalf of Acxiom
 * @property {string} [hem] - SHA-256 hashed email for improved match rate
 * @property {string} [sourceId] - EID source to request from the lookup API. Defaults to 'acxiom.id'
 * @property {string} [apiUrl] - Override the full API endpoint URL
 */

/**
 * @typedef {Object} AcxiomRealIdValue
 * @property {string} id - The resolved Acxiom Real ID token
 * @property {number} atype - Agent type per OpenRTB spec (1 = cookie/device, 2 = in-app, 3 = person-based)
 */

/**
 * @typedef {Object} AcxiomRealIdConfig
 * @property {'acxiomRealId'} name - Module identifier
 * @property {AcxiomRealIdParams} params - Module configuration parameters
 * @property {Object} [storage] - Storage configuration
 * @property {'html5'|'cookie'} [storage.type] - Storage method
 * @property {string} [storage.name] - Storage key name
 * @property {number} [storage.expires] - TTL in days
 * @property {number} [storage.refreshInSeconds] - How often to re-fetch the ID in seconds
 */

const MODULE_NAME = 'acxiomRealId';
const DEFAULT_API_URL = 'https://ids.api.gcprivacy.id/v1/eid/l';
const DEFAULT_SOURCE_ID = 'acxiom.id';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

const US_GPP_SID_API = {
  7: 'usnat',
  8: 'usca',
  9: 'usva',
  10: 'usco',
  11: 'usut',
  12: 'usct'
};

function flatSection(subsections) {
  if (!Array.isArray(subsections)) return subsections;
  return subsections.reduceRight((merged, section) => Object.assign(section, merged), {});
}

function isGppOptedOut(gppData) {
  if (!gppData || !gppData.applicableSections || !gppData.parsedSections) {
    return false;
  }
  for (const sid of gppData.applicableSections) {
    const apiName = US_GPP_SID_API[sid];
    if (!apiName) continue;
    const sectionData = flatSection(gppData.parsedSections[apiName]);
    if (sectionData && (sectionData.SaleOptOut === 1 || sectionData.SharingOptOut === 1)) {
      return true;
    }
  }
  return false;
}

function isConsentBlocked(consentData) {
  if (!consentData) {
    return false;
  }

  // EU/UK passive suppression: TCF string present → do not fire
  const gdpr = consentData.gdpr;
  if (gdpr && (gdpr.gdprApplies || gdpr.consentString)) {
    return true;
  }

  // CCPA: us_privacy opt-out of sale (position 3, 0-indexed charAt(2))
  const usp = consentData.usp;
  if (usp && typeof usp === 'string' && usp.length >= 3 && usp.charAt(2) === 'Y') {
    return true;
  }

  // GPP: US state sections — suppress on Sale or Sharing opt-out
  if (isGppOptedOut(consentData.gpp)) {
    return true;
  }

  return false;
}

function isConsentBlockedByHandlers() {
  const gdpr = gdprDataHandler.getConsentData();
  if (gdpr && (gdpr.gdprApplies || gdpr.consentString)) {
    return true;
  }
  const usp = uspDataHandler.getConsentData();
  if (usp && typeof usp === 'string' && usp.length >= 3 && usp.charAt(2) === 'Y') {
    return true;
  }
  const gpp = gppDataHandler.getConsentData();
  if (isGppOptedOut(gpp)) {
    return true;
  }
  return false;
}

function deleteStoredToken(config) {
  const storageName = (config && config.storage && config.storage.name) || MODULE_NAME;
  const expired = new Date(0).toUTCString();
  if (storage.localStorageIsEnabled()) {
    ['', '_exp', '_cst', '_last'].forEach(suffix => {
      storage.removeDataFromLocalStorage(`${storageName}${suffix}`);
    });
  }
  if (storage.cookiesAreEnabled()) {
    ['', '_cst', '_last'].forEach(suffix => {
      storage.setCookie(`${storageName}${suffix}`, '', expired);
    });
  }
}

function buildLookupUrl(apiUrl) {
  return (apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
}

/** @type {Submodule} */
export const acxiomRealIdSubmodule = {
  name: MODULE_NAME,

  decode(value, config) {
    if (isConsentBlockedByHandlers()) {
      deleteStoredToken(config);
      return undefined;
    }
    if (value && typeof value === 'string') {
      return { acxiomRealId: { id: value, atype: 1 } };
    }
    if (value && typeof value === 'object' && value.id) {
      return { acxiomRealId: { id: value.id, atype: value.atype || 1 } };
    }
    return undefined;
  },

  getId(config, consentData, storedId) {
    const configParams = (config && config.params) || {};
    const { partnerId, apiUrl, sourceId, hem } = configParams;

    if (!partnerId) {
      logError('AcxiomRealId: partnerId is required.');
      return undefined;
    }

    if (isConsentBlocked(consentData)) {
      deleteStoredToken(config);
      return undefined;
    }

    if (storedId) {
      return { id: storedId };
    }

    const url = buildLookupUrl(apiUrl);
    const payload = {
      partnerId,
      ip: '',
      userAgent: getWindowSelf().navigator?.userAgent || '',
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
                cb();
              }
            },
            error: () => {
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
