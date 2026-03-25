/**
 * This module adds Rediads ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/rediadsIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { VENDORLESS_GVLID } from '../src/consentHandler.js';
import { cyrb53Hash, generateUUID, isPlainObject, isStr } from '../src/utils.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'rediadsId';
const DEFAULT_SOURCE = 'rediads.com';
const DEFAULT_ATYPE = 1;
const DEFAULT_EXPIRES_DAYS = 30;
const DEFAULT_REFRESH_SECONDS = 3600;
const GPP_OPT_OUT_SECTIONS = [7, 8, 9, 10, 11, 12];

function normalizeStoredId(storedId) {
  if (isPlainObject(storedId)) {
    return storedId;
  }

  if (isStr(storedId)) {
    try {
      const parsed = JSON.parse(storedId);
      if (isPlainObject(parsed)) {
        return parsed;
      }
    } catch (e) {}
  }
}

function getConsentHash(consentData = {}) {
  return `hash_${cyrb53Hash(JSON.stringify({
    gdpr: consentData.gdpr?.consentString || null,
    gpp: consentData.gpp?.gppString || null,
    usp: consentData.usp || null,
    coppa: consentData.coppa === true
  }))}`;
}

function hasTcfPurpose1Consent(gdprConsent) {
  return gdprConsent?.vendorData?.purpose?.consents?.[1] === true ||
    gdprConsent?.vendorData?.purposeConsents?.[1] === true;
}

function canWriteStorage(consentData = {}) {
  if (consentData.coppa === true) {
    return false;
  }

  const gdprConsent = consentData.gdpr;
  if (gdprConsent?.gdprApplies || gdprConsent?.vendorData || gdprConsent?.consentString) {
    return isStr(gdprConsent?.consentString) &&
      gdprConsent.consentString.length > 0 &&
      hasTcfPurpose1Consent(gdprConsent);
  }

  return true;
}

function canShareId(consentData = {}) {
  if (consentData.coppa === true) {
    return false;
  }

  if (isStr(consentData.usp) && consentData.usp.charAt(2) === 'Y') {
    return false;
  }

  if (Array.isArray(consentData.gpp?.applicableSections)) {
    return !consentData.gpp.applicableSections.some((section) => GPP_OPT_OUT_SECTIONS.includes(section));
  }

  return true;
}

function ensureStorageDefaults(config) {
  if (isPlainObject(config?.storage)) {
    if (config.storage.expires == null) {
      config.storage.expires = DEFAULT_EXPIRES_DAYS;
    }
    if (config.storage.refreshInSeconds == null) {
      config.storage.refreshInSeconds = DEFAULT_REFRESH_SECONDS;
    }
  }
}

function buildStoredId(config, consentData, existingId) {
  const params = config?.params || {};
  const source = params.source || DEFAULT_SOURCE;
  const expiresDays = config?.storage?.expires ?? DEFAULT_EXPIRES_DAYS;
  const refreshInSeconds = config?.storage?.refreshInSeconds ?? DEFAULT_REFRESH_SECONDS;
  const now = Date.now();

  return {
    id: existingId || `ruid_${generateUUID()}`,
    source,
    atype: DEFAULT_ATYPE,
    canShare: canShareId(consentData),
    consentHash: getConsentHash(consentData),
    refreshAfter: now + (refreshInSeconds * 1000),
    expiresAt: now + (expiresDays * 24 * 60 * 60 * 1000)
  };
}

/** @type {Submodule} */
export const rediadsIdSubmodule = {
  name: MODULE_NAME,
  gvlid: VENDORLESS_GVLID,

  decode(value) {
    const storedId = normalizeStoredId(value);
    if (!isStr(storedId?.id) || storedId.id.length === 0) {
      return undefined;
    }

    return {
      rediadsId: {
        uid: storedId.id,
        source: storedId.source || DEFAULT_SOURCE,
        atype: storedId.atype || DEFAULT_ATYPE,
        ext: {
          canShare: storedId.canShare !== false,
          consentHash: storedId.consentHash,
          refreshAfter: storedId.refreshAfter
        }
      }
    };
  },

  getId(config, consentData, storedId) {
    ensureStorageDefaults(config);

    if (!canWriteStorage(consentData)) {
      return undefined;
    }

    const normalized = normalizeStoredId(storedId);
    return {
      id: buildStoredId(config, consentData, normalized?.id)
    };
  },

  extendId(config, consentData, storedId) {
    ensureStorageDefaults(config);

    if (!canWriteStorage(consentData)) {
      return undefined;
    }

    const normalized = normalizeStoredId(storedId);
    if (!isStr(normalized?.id) || normalized.id.length === 0) {
      return this.getId(config, consentData, storedId);
    }

    return {
      id: buildStoredId(config, consentData, normalized.id)
    };
  },

  eids: {
    rediadsId(values) {
      return values
        .filter((value) => isStr(value?.uid) && value.ext?.canShare !== false)
        .map((value) => ({
          source: value.source || DEFAULT_SOURCE,
          uids: [{
            id: value.uid,
            atype: value.atype || DEFAULT_ATYPE
          }]
        }));
    }
  }
};

submodule('userId', rediadsIdSubmodule);
