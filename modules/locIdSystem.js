/**
 * This module adds LocID to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/locIdSystem
 * @requires module:modules/userId
 */

import { logInfo, logWarn, logError, generateUUID, mergeDeep } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { gppDataHandler, uspDataHandler } from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';

const MODULE_NAME = 'locid';
const LOG_PREFIX = 'LocID: ';
const STORAGE_KEY = '_locid';
const DEFAULT_EXPIRATION_DAYS = 30;
const DEFAULT_REFRESH_SECONDS = 86400; // 24 hours
const HOLDOUT_RATE = 0.1; // 10% control group

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

function createLogger(logger, prefix) {
  return function (...args) {
    logger(prefix + ' ', ...args);
  }
}

const _logInfo = createLogger(logInfo, LOG_PREFIX);
const _logWarn = createLogger(logWarn, LOG_PREFIX);
const _logError = createLogger(logError, LOG_PREFIX);

function isValidId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 256;
}

function simpleHash(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function isInHoldout(id, config) {
  const holdoutOverride = config?.params?.holdoutOverride;
  if (holdoutOverride === 'forceControl') return true;
  if (holdoutOverride === 'forceTreatment') return false;

  if (!id) return false; // never treat "no id" as control

  // Deterministic holdout based on hash(id) mod 10
  const hash = simpleHash(id);
  return (hash % 10) < Math.round(HOLDOUT_RATE * 10);
}

function hasValidConsent(consentData) {
  if (consentData?.gdpr?.gdprApplies === true) {
    if (!consentData.gdpr.consentString || consentData.gdpr.consentString.length === 0) {
      _logWarn('GDPR applies but no consent string provided, skipping storage operations');
      return false;
    }
  }

  const uspData = uspDataHandler.getConsentData();
  if (uspData && uspData.length >= 3 && uspData.charAt(2) === 'Y') {
    _logWarn('US Privacy opt-out detected, skipping storage operations');
    return false;
  }

  const gppData = gppDataHandler.getConsentData();
  if (gppData?.applicableSections?.includes(7) &&
      gppData?.parsedSections?.usnat?.KnownChildSensitiveDataConsents?.includes(1)) {
    _logWarn('GPP indicates opt-out, skipping storage operations');
    return false;
  }

  return true;
}

function getStoredId(config) {
  const storageConfig = config.storage;
  if (!storageConfig) return null;

  let storedValue = null;
  const storageKey = storageConfig.name || STORAGE_KEY;

  if (storageConfig.type === 'localStorage' || storageConfig.type === 'localStorage&cookie') {
    if (storage.localStorageIsEnabled()) {
      storedValue = storage.getDataFromLocalStorage(storageKey);
    }
  }

  if (!storedValue && (storageConfig.type === 'cookie' || storageConfig.type === 'localStorage&cookie')) {
    if (storage.cookiesAreEnabled()) {
      storedValue = storage.getCookie(storageKey);
    }
  }

  if (storedValue) {
    try {
      const parsed = JSON.parse(storedValue);
      if (parsed.id && parsed.timestamp) {
        const now = Date.now();
        const expireTime = parsed.timestamp + ((storageConfig.expires || DEFAULT_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000);

        if (now < expireTime) {
          const refreshTime = parsed.timestamp + ((storageConfig.refreshInSeconds || DEFAULT_REFRESH_SECONDS) * 1000);
          return {
            id: parsed.id,
            timestamp: parsed.timestamp,
            shouldRefresh: now > refreshTime
          };
        } else {
          _logInfo('Stored ID has expired');
        }
      }
    } catch (e) {
      _logWarn('Failed to parse stored ID', e);
    }
  }

  return null;
}

function storeId(config, id, consentData) {
  if (!hasValidConsent(consentData)) {
    return;
  }

  const storageConfig = config.storage;
  if (!storageConfig) {
    _logWarn('No storage configuration provided, ID will not be persisted');
    return;
  }

  const storageKey = storageConfig.name || STORAGE_KEY;
  const storageValue = JSON.stringify({
    id: id,
    timestamp: Date.now()
  });

  const expireDays = storageConfig.expires || DEFAULT_EXPIRATION_DAYS;

  if (storageConfig.type === 'localStorage' || storageConfig.type === 'localStorage&cookie') {
    if (storage.localStorageIsEnabled()) {
      storage.setDataInLocalStorage(storageKey, storageValue);
      _logInfo('ID stored in localStorage');
    }
  }

  if (storageConfig.type === 'cookie' || storageConfig.type === 'localStorage&cookie') {
    if (storage.cookiesAreEnabled()) {
      const expires = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toUTCString();
      storage.setCookie(storageKey, storageValue, expires);
      _logInfo('ID stored in cookie');
    }
  }
}

function generateDeviceId() {
  return generateUUID();
}

function logExposure(data, config) {
  const endpoint = config?.params?.loggingEndpoint;
  if (!endpoint) return;

  try {
    ajax(endpoint, null, JSON.stringify(data), {
      method: 'POST',
      contentType: 'application/json'
    });
  } catch (e) {
    // Never throw - logging is best effort
  }
}

function formatGamOutput(id, config) {
  const gamConfig = config.params?.gam;
  if (!gamConfig || !gamConfig.enabled) {
    return null;
  }

  const maxLen = gamConfig.maxLen || 150;
  const truncatedId = id.length > maxLen ? id.substring(0, maxLen) : id;

  const result = {
    key: gamConfig.key || 'locid'
  };

  if (gamConfig.mode === 'ppid') {
    result.ppid = truncatedId;
  } else if (gamConfig.mode === 'encryptedSignal') {
    result.encryptedSignal = truncatedId;
  }

  return result;
}

export const locIdSubmodule = {
  name: MODULE_NAME,

  gvlid: undefined, // module does not register a GVL ID; consent gating handled internally

  decode(value, config) {
    try {
      if (!isValidId(value)) {
        _logWarn('Invalid stored value for decode:', value);
        return undefined;
      }

      // Check holdout - return nothing if user is in control group
      if (isInHoldout(value, config)) {
        _logInfo('User in holdout control group, not returning ID');
        return undefined;
      }

      const result = { locid: value };

      const gamOutput = formatGamOutput(value, config);
      if (gamOutput) {
        result._gam = gamOutput;
      }

      _logInfo('LocID decode returned:', result);
      return result;
    } catch (e) {
      _logError('Error in LocID decode:', e);
      return undefined;
    }
  },

  getId(config, consentData, storedId) {
    try {
      _logInfo('LocID getId called with config:', config);

      // Check consent first
      if (!hasValidConsent(consentData)) {
        _logInfo('No valid consent, skipping LocID generation');
        return;
      }

      const params = config?.params || {};
      const source = params.source || 'device'; // Default to device if not specified

      if (source === 'publisher') {
        const providedId = storedId || params.value;
        if (providedId && isValidId(providedId)) {
          _logInfo('Using publisher-provided ID');
          return { id: providedId };
        } else {
          _logWarn('Publisher source specified but no valid ID provided');
          return;
        }
      }

      const stored = getStoredId(config);
      if (stored && !stored.shouldRefresh) {
        _logInfo('Using stored ID (no refresh needed)');
        return { id: stored.id };
      }

      if (source === 'device') {
        const newId = generateDeviceId();
        _logInfo('Generated new device ID');

        storeId(config, newId, consentData);

        return { id: newId };
      }

      // Endpoint source removed - first-party only
      if (source === 'endpoint') {
        _logWarn('Endpoint source no longer supported - LocID is first-party only');
        return;
      }

      _logError('Unknown LocID source:', source);
    } catch (e) {
      _logError('Error in LocID getId:', e);
      // Fail open - don't block auctions
    }
  },

  extendId(config, consentData, storedId) {
    try {
      _logInfo('LocID extendId called for ORTB2 injection');

      // Get the current ID
      const idResult = this.getId(config, consentData, storedId);
      if (!idResult?.id) {
        _logInfo('No LocID available for ORTB2 injection');
        return;
      }

      const locId = idResult.id;
      const isHoldout = isInHoldout(locId, config);

      // Calculate stability days from stored timestamp
      const stored = getStoredId(config);
      const stabilityDays = stored?.timestamp
        ? Math.max(0, Math.floor((Date.now() - stored.timestamp) / (24 * 60 * 60 * 1000)))
        : 0;

      // Prepare ORTB2 data
      const ortb2Data = {
        locid_confidence: 1.0, // Constant for v1
        locid_stability_days: stabilityDays,
        locid_audiences: [] // Empty for v1
      };

      // Log exposure for lift measurement
      const auctionId = config?.auctionId || 'unknown';
      const exposureLog = {
        auction_id: auctionId,
        is_holdout: isHoldout,
        locid_present: !isHoldout,
        signals_emitted: isHoldout ? 0 : Object.keys(ortb2Data).length,
        signal_names: isHoldout ? [] : Object.keys(ortb2Data),
        timestamp: Date.now()
      };

      logExposure(exposureLog, config);

      // Don't inject ORTB2 data if user is in holdout
      if (isHoldout) {
        _logInfo('User in holdout, skipping ORTB2 injection');
        return;
      }

      // Safely merge into ORTB2 user.ext.data
      const currentOrtb2 = config.ortb2 || {};
      const updatedOrtb2 = mergeDeep({}, currentOrtb2, {
        user: {
          ext: {
            data: ortb2Data
          }
        }
      });

      _logInfo('Injecting LocID ORTB2 data:', ortb2Data);
      return { ortb2: updatedOrtb2 };
    } catch (e) {
      _logError('Error in LocID extendId:', e);
      // Fail open - don't block auctions
    }
  },

  eids: {
    locid: {
      source: 'locid.com',
      atype: 1,
      getValue: function(data) {
        return data;
      }
    }
  }
};

submodule(MODULE_TYPE_UID, locIdSubmodule);
