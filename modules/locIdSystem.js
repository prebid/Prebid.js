/**
 * This file is licensed under the Apache 2.0 license.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * This module adds LocID to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/locIdSystem
 * @requires module:modules/userId
 */

import { logWarn, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { gppDataHandler, uspDataHandler } from '../src/adapterManager.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { VENDORLESS_GVLID } from '../src/consentHandler.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = 'locId';
const LOG_PREFIX = 'LocID:';
const DEFAULT_TIMEOUT_MS = 800;
const DEFAULT_EID_SOURCE = 'locid.com';
// EID atype: 1 = AdCOM AgentTypeWeb (agent type for web environments)
const DEFAULT_EID_ATYPE = 1;
const MAX_ID_LENGTH = 512;
const MAX_CONNECTION_IP_LENGTH = 64;
const DEFAULT_IP_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const IP_CACHE_SUFFIX = '_ip';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

/**
 * Normalizes privacy mode config to a boolean flag.
 * Supports both requirePrivacySignals (boolean) and privacyMode (string enum).
 *
 * Precedence: requirePrivacySignals (if true) takes priority over privacyMode.
 * - privacyMode is the preferred high-level setting for new integrations.
 * - requirePrivacySignals exists for backwards compatibility with integrators
 *   who prefer a simple boolean.
 *
 * @param {Object} params - config.params
 * @returns {boolean} true if privacy signals are required, false otherwise
 */
function shouldRequirePrivacySignals(params) {
  // requirePrivacySignals=true takes precedence (backwards compatibility)
  if (params?.requirePrivacySignals === true) {
    return true;
  }
  if (params?.privacyMode === 'requireSignals') {
    return true;
  }
  // Default: allowWithoutSignals
  return false;
}

function getUspConsent(consentData) {
  if (consentData && consentData.usp != null) {
    return consentData.usp;
  }
  return consentData?.uspConsent;
}

function getGppConsent(consentData) {
  if (consentData && consentData.gpp != null) {
    return consentData.gpp;
  }
  return consentData?.gppConsent;
}

/**
 * Checks if any privacy signals are present in consentData or data handlers.
 *
 * IMPORTANT: gdprApplies alone does NOT count as a privacy signal.
 * A publisher may set gdprApplies=true without having a CMP installed.
 * We only consider GDPR signals "present" when actual consent framework
 * artifacts exist (consentString, vendorData). This supports LI-based
 * operation where no TCF consent string is required.
 *
 * "Signals present" means ANY of the following are available:
 * - consentString or gdpr.consentString (indicates CMP provided framework data)
 * - vendorData or gdpr.vendorData (indicates CMP provided vendor data)
 * - usp or uspConsent (US Privacy string)
 * - gpp or gppConsent (GPP consent data)
 * - Data from gppDataHandler or uspDataHandler
 *
 * @param {Object} consentData - The consent data object passed to getId
 * @returns {boolean} true if any privacy signals are present
 */
function hasPrivacySignals(consentData) {
  // Check GDPR-related signals (flat and nested)
  // NOTE: gdprApplies alone is NOT a signal - it just indicates jurisdiction.
  // A signal requires actual CMP artifacts (consentString or vendorData).
  if (consentData?.consentString || consentData?.gdpr?.consentString) {
    return true;
  }
  if (consentData?.vendorData || consentData?.gdpr?.vendorData) {
    return true;
  }

  // Check USP consent
  const uspConsent = getUspConsent(consentData);
  if (uspConsent) {
    return true;
  }

  // Check GPP consent
  const gppConsent = getGppConsent(consentData);
  if (gppConsent) {
    return true;
  }

  // Check data handlers
  const uspFromHandler = uspDataHandler.getConsentData();
  if (uspFromHandler) {
    return true;
  }

  const gppFromHandler = gppDataHandler.getConsentData();
  if (gppFromHandler) {
    return true;
  }

  return false;
}

function isValidId(id) {
  return typeof id === 'string' && id.trim().length > 0 && id.length <= MAX_ID_LENGTH;
}

function isValidConnectionIp(ip) {
  return typeof ip === 'string' && ip.length > 0 && ip.length <= MAX_CONNECTION_IP_LENGTH;
}

function normalizeStoredId(storedId) {
  if (!storedId) {
    return null;
  }
  if (typeof storedId === 'string') {
    return null;
  }
  if (typeof storedId === 'object') {
    // Preserve explicit null for id (means "empty tx_cloc, valid cached response").
    // 'id' in storedId is needed because ?? treats null as nullish and would
    // incorrectly fall through to tx_cloc.
    const hasExplicitId = 'id' in storedId;
    const id = hasExplicitId ? storedId.id : (storedId.tx_cloc ?? null);
    const connectionIp = storedId.connectionIp ?? storedId.connection_ip;
    return { ...storedId, id, connectionIp };
  }
  return null;
}

/**
 * Checks privacy framework signals. Returns true if ID operations are allowed.
 *
 * LocID operates under Legitimate Interest and does not require a TCF consent
 * string when no privacy framework is present. When privacy signals exist,
 * framework processing restrictions are enforced.
 *
 * @param {Object} consentData - The consent data object from Prebid
 * @param {Object} params - config.params for privacy mode settings
 * @returns {boolean} true if ID operations are allowed
 */
function hasValidConsent(consentData, params) {
  const requireSignals = shouldRequirePrivacySignals(params);
  const signalsPresent = hasPrivacySignals(consentData);

  // B) If privacy signals are NOT present
  if (!signalsPresent) {
    if (requireSignals) {
      logWarn(LOG_PREFIX, 'Privacy signals required but none present');
      return false;
    }
    // Default: allow operation without privacy signals (LI-based operation)
    return true;
  }

  // A) Privacy signals ARE present - enforce applicable restrictions
  //
  // Note: privacy signals can come from GDPR, USP, or GPP. GDPR checks only
  // apply when GDPR is flagged AND CMP artifacts (consentString/vendorData)
  // are present. gdprApplies alone does not trigger GDPR enforcement.

  // Check GDPR - support both flat and nested shapes
  const gdprApplies = consentData?.gdprApplies === true || consentData?.gdpr?.gdprApplies === true;
  const consentString = consentData?.consentString || consentData?.gdpr?.consentString;
  const vendorData = consentData?.vendorData || consentData?.gdpr?.vendorData;
  const gdprCmpArtifactsPresent = !!(consentString || vendorData);

  if (gdprApplies && gdprCmpArtifactsPresent) {
    // When GDPR applies AND we have CMP signals, require consentString
    if (!consentString || consentString.length === 0) {
      logWarn(LOG_PREFIX, 'GDPR framework data missing consent string');
      return false;
    }
  }

  // Check USP for processing restriction
  const uspData = getUspConsent(consentData) ?? uspDataHandler.getConsentData();
  if (uspData && uspData.length >= 3 && uspData.charAt(2) === 'Y') {
    logWarn(LOG_PREFIX, 'US Privacy framework processing restriction detected');
    return false;
  }

  // Check GPP for processing restriction
  const gppData = getGppConsent(consentData) ?? gppDataHandler.getConsentData();
  if (gppData?.applicableSections?.includes(7) &&
    gppData?.parsedSections?.usnat?.KnownChildSensitiveDataConsents?.includes(1)) {
    logWarn(LOG_PREFIX, 'GPP usnat KnownChildSensitiveDataConsents processing restriction detected');
    return false;
  }

  return true;
}

function parseEndpointResponse(response) {
  if (!response) {
    return null;
  }
  try {
    return typeof response === 'string' ? JSON.parse(response) : response;
  } catch (e) {
    logError(LOG_PREFIX, 'Error parsing endpoint response:', e.message);
    return null;
  }
}

/**
 * Extracts LocID from endpoint response.
 * Only tx_cloc is accepted.
 */
function extractLocIdFromResponse(parsed) {
  if (!parsed) return null;

  if (isValidId(parsed.tx_cloc)) {
    return parsed.tx_cloc;
  }

  logWarn(LOG_PREFIX, 'Could not extract valid tx_cloc from response');
  return null;
}

function extractConnectionIp(parsed) {
  if (!parsed) {
    return null;
  }
  const connectionIp = parsed.connection_ip ?? parsed.connectionIp;
  return isValidConnectionIp(connectionIp) ? connectionIp : null;
}

function getIpCacheKey(config) {
  const baseName = config?.storage?.name || '_locid';
  return config?.params?.ipCacheName || (baseName + IP_CACHE_SUFFIX);
}

function getIpCacheTtlMs(config) {
  const ttl = config?.params?.ipCacheTtlMs;
  return (typeof ttl === 'number' && ttl > 0) ? ttl : DEFAULT_IP_CACHE_TTL_MS;
}

function readIpCache(config) {
  try {
    const key = getIpCacheKey(config);
    const raw = storage.getDataFromLocalStorage(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry !== 'object') return null;
    if (!isValidConnectionIp(entry.ip)) return null;
    if (typeof entry.expiresAt === 'number' && Date.now() > entry.expiresAt) return null;
    return entry;
  } catch (e) {
    logWarn(LOG_PREFIX, 'Error reading IP cache:', e.message);
    return null;
  }
}

function writeIpCache(config, ip) {
  if (!isValidConnectionIp(ip)) return;
  try {
    const key = getIpCacheKey(config);
    const nowMs = Date.now();
    const ttlMs = getIpCacheTtlMs(config);
    const entry = {
      ip: ip,
      fetchedAt: nowMs,
      expiresAt: nowMs + ttlMs
    };
    storage.setDataInLocalStorage(key, JSON.stringify(entry));
  } catch (e) {
    logWarn(LOG_PREFIX, 'Error writing IP cache:', e.message);
  }
}

/**
 * Parses an IP response from an IP-only endpoint.
 * Supports JSON ({ip: "..."}, {connection_ip: "..."}) and plain text IP.
 */
function parseIpResponse(response) {
  if (!response) return null;

  if (typeof response === 'string') {
    const trimmed = response.trim();
    if (trimmed.charAt(0) === '{') {
      try {
        const parsed = JSON.parse(trimmed);
        const ip = parsed.ip || parsed.connection_ip || parsed.connectionIp;
        return isValidConnectionIp(ip) ? ip : null;
      } catch (e) {
        // Not valid JSON, try as plain text
      }
    }
    return isValidConnectionIp(trimmed) ? trimmed : null;
  }

  if (typeof response === 'object') {
    const ip = response.ip || response.connection_ip || response.connectionIp;
    return isValidConnectionIp(ip) ? ip : null;
  }

  return null;
}

/**
 * Checks if a stored tx_cloc entry is valid for reuse.
 * Accepts both valid id strings AND null (empty tx_cloc is a valid cached result).
 */
function isStoredEntryReusable(normalizedStored, currentIp) {
  if (!normalizedStored || !isValidConnectionIp(normalizedStored.connectionIp)) {
    return false;
  }
  if (isExpired(normalizedStored)) {
    return false;
  }
  if (currentIp && normalizedStored.connectionIp !== currentIp) {
    return false;
  }
  // id must be either a valid string or explicitly null (empty tx_cloc)
  return normalizedStored.id === null || isValidId(normalizedStored.id);
}

function getExpiresAt(config, nowMs) {
  const expiresDays = config?.storage?.expires;
  if (typeof expiresDays !== 'number' || expiresDays <= 0) {
    return undefined;
  }
  return nowMs + (expiresDays * 24 * 60 * 60 * 1000);
}

function buildStoredId(id, connectionIp, config) {
  const nowMs = Date.now();
  return {
    id,
    connectionIp,
    createdAt: nowMs,
    updatedAt: nowMs,
    expiresAt: getExpiresAt(config, nowMs)
  };
}

function isExpired(storedEntry) {
  return typeof storedEntry?.expiresAt === 'number' && Date.now() > storedEntry.expiresAt;
}

/**
 * Builds the request URL, appending altId if configured.
 * Preserves URL fragments by appending query params before the hash.
 */
function buildRequestUrl(endpoint, altId) {
  if (!altId) {
    return endpoint;
  }

  // Split on hash to preserve fragment
  const hashIndex = endpoint.indexOf('#');
  let base = endpoint;
  let fragment = '';

  if (hashIndex !== -1) {
    base = endpoint.substring(0, hashIndex);
    fragment = endpoint.substring(hashIndex);
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}alt_id=${encodeURIComponent(altId)}${fragment}`;
}

/**
 * Fetches LocID from the configured endpoint (GET only).
 */
function fetchLocIdFromEndpoint(config, callback) {
  const params = config?.params || {};
  const endpoint = params.endpoint;
  const timeoutMs = params.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (!endpoint) {
    logError(LOG_PREFIX, 'No endpoint configured');
    callback(undefined);
    return;
  }

  const requestUrl = buildRequestUrl(endpoint, params.altId);

  const requestOptions = {
    method: 'GET',
    contentType: 'application/json',
    withCredentials: params.withCredentials === true
  };

  // Add x-api-key header if apiKey is configured
  if (params.apiKey) {
    requestOptions.customHeaders = {
      'x-api-key': params.apiKey
    };
  }

  let callbackFired = false;
  const safeCallback = (result) => {
    if (!callbackFired) {
      callbackFired = true;
      callback(result);
    }
  };

  const onSuccess = (response) => {
    const parsed = parseEndpointResponse(response);
    if (!parsed) {
      safeCallback(undefined);
      return;
    }
    const connectionIp = extractConnectionIp(parsed);
    if (!connectionIp) {
      logWarn(LOG_PREFIX, 'Missing or invalid connection_ip in response');
      safeCallback(undefined);
      return;
    }
    // tx_cloc may be null (empty/missing for this IP) -- this is a valid cacheable result.
    // connection_ip is always required.
    const locId = extractLocIdFromResponse(parsed);
    writeIpCache(config, connectionIp);
    safeCallback(buildStoredId(locId, connectionIp, config));
  };

  const onError = (error) => {
    logWarn(LOG_PREFIX, 'Request failed:', error);
    safeCallback(undefined);
  };

  try {
    const ajax = ajaxBuilder(timeoutMs);
    ajax(requestUrl, { success: onSuccess, error: onError }, null, requestOptions);
  } catch (e) {
    logError(LOG_PREFIX, 'Error initiating request:', e.message);
    safeCallback(undefined);
  }
}

/**
 * Fetches the connection IP from a separate lightweight endpoint (GET only).
 * Callback receives the IP string on success or null on failure.
 */
function fetchIpFromEndpoint(config, callback) {
  const params = config?.params || {};
  const ipEndpoint = params.ipEndpoint;
  const timeoutMs = params.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (!ipEndpoint) {
    callback(null);
    return;
  }

  let callbackFired = false;
  const safeCallback = (result) => {
    if (!callbackFired) {
      callbackFired = true;
      callback(result);
    }
  };

  const onSuccess = (response) => {
    const ip = parseIpResponse(response);
    safeCallback(ip);
  };

  const onError = (error) => {
    logWarn(LOG_PREFIX, 'IP endpoint request failed:', error);
    safeCallback(null);
  };

  try {
    const ajax = ajaxBuilder(timeoutMs);
    const requestOptions = {
      method: 'GET',
      withCredentials: params.withCredentials === true
    };
    if (params.apiKey) {
      requestOptions.customHeaders = {
        'x-api-key': params.apiKey
      };
    }
    ajax(ipEndpoint, { success: onSuccess, error: onError }, null, requestOptions);
  } catch (e) {
    logError(LOG_PREFIX, 'Error initiating IP request:', e.message);
    safeCallback(null);
  }
}

export const locIdSubmodule = {
  name: MODULE_NAME,
  aliasName: 'locid',
  gvlid: VENDORLESS_GVLID,

  /**
   * Decode stored value into userId object.
   */
  decode(value) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const id = value?.id ?? value?.tx_cloc;
    const connectionIp = value?.connectionIp ?? value?.connection_ip;
    if (isValidId(id) && isValidConnectionIp(connectionIp)) {
      return { locId: id };
    }
    return undefined;
  },

  /**
   * Get the LocID from endpoint.
   * Returns {id} for sync or {callback} for async per Prebid patterns.
   *
   * Two-tier cache: IP cache (4h default) and tx_cloc cache (7d default).
   * IP is refreshed more frequently to detect network changes while keeping
   * tx_cloc stable for its full cache period.
   */
  getId(config, consentData, storedId) {
    const params = config?.params || {};

    // Check privacy restrictions first
    if (!hasValidConsent(consentData, params)) {
      return undefined;
    }

    const normalizedStored = normalizeStoredId(storedId);
    const cachedIp = readIpCache(config);

    // Step 1: IP cache is valid -- check if tx_cloc matches
    if (cachedIp) {
      if (isStoredEntryReusable(normalizedStored, cachedIp.ip)) {
        return { id: normalizedStored };
      }
      // IP cached but tx_cloc missing, expired, or IP mismatch -- full fetch
      return {
        callback: (callback) => {
          fetchLocIdFromEndpoint(config, callback);
        }
      };
    }

    // Step 2: IP cache expired or missing
    if (params.ipEndpoint) {
      // Two-call optimization: lightweight IP check first
      return {
        callback: (callback) => {
          fetchIpFromEndpoint(config, (freshIp) => {
            if (!freshIp) {
              // IP fetch failed; fall back to main endpoint
              fetchLocIdFromEndpoint(config, callback);
              return;
            }
            writeIpCache(config, freshIp);
            // Check if stored tx_cloc matches the fresh IP
            if (isStoredEntryReusable(normalizedStored, freshIp)) {
              callback(normalizedStored);
              return;
            }
            // IP changed or no valid tx_cloc -- full fetch
            fetchLocIdFromEndpoint(config, callback);
          });
        }
      };
    }

    // Step 3: No ipEndpoint configured -- call main endpoint to refresh IP.
    // Only update tx_cloc if IP changed or tx_cloc cache expired.
    return {
      callback: (callback) => {
        fetchLocIdFromEndpoint(config, (freshEntry) => {
          if (!freshEntry) {
            callback(undefined);
            return;
          }
          // Honor empty tx_cloc: if the server returned null, use the fresh
          // entry so stale identifiers are cleared (cached as id: null).
          if (freshEntry.id === null) {
            callback(freshEntry);
            return;
          }
          // IP is already cached by fetchLocIdFromEndpoint's onSuccess.
          // Check if we should preserve the existing tx_cloc (avoid churning it).
          if (normalizedStored?.id !== null && isStoredEntryReusable(normalizedStored, freshEntry.connectionIp)) {
            callback(normalizedStored);
            return;
          }
          // IP changed or tx_cloc expired/missing -- use fresh entry
          callback(freshEntry);
        });
      }
    };
  },

  /**
   * Extend existing LocID.
   * Accepts id: null (empty tx_cloc) as a valid cached result.
   * If IP cache is missing/expired/mismatched, return a callback to refresh.
   */
  extendId(config, consentData, storedId) {
    const normalizedStored = normalizeStoredId(storedId);
    if (!normalizedStored || !isValidConnectionIp(normalizedStored.connectionIp)) {
      return undefined;
    }
    // Accept both valid id strings AND null (empty tx_cloc is a valid cached result)
    if (normalizedStored.id !== null && !isValidId(normalizedStored.id)) {
      return undefined;
    }
    if (isExpired(normalizedStored)) {
      return undefined;
    }
    if (!hasValidConsent(consentData, config?.params)) {
      return undefined;
    }
    const refreshInSeconds = config?.storage?.refreshInSeconds;
    if (typeof refreshInSeconds === 'number' && refreshInSeconds > 0) {
      const createdAt = normalizedStored.createdAt;
      if (typeof createdAt !== 'number') {
        return undefined;
      }
      const refreshAfterMs = refreshInSeconds * 1000;
      if (Date.now() - createdAt >= refreshAfterMs) {
        return undefined;
      }
    }
    // Check IP cache -- if expired/missing or IP changed, trigger re-fetch
    const cachedIp = readIpCache(config);
    if (!cachedIp || cachedIp.ip !== normalizedStored.connectionIp) {
      return {
        callback: (callback) => {
          fetchLocIdFromEndpoint(config, callback);
        }
      };
    }
    return { id: normalizedStored };
  },

  /**
   * EID configuration following standard Prebid shape.
   */
  eids: {
    locId: {
      source: DEFAULT_EID_SOURCE,
      atype: DEFAULT_EID_ATYPE,
      getValue: function (data) {
        if (typeof data === 'string') {
          return data;
        }
        if (!data || typeof data !== 'object') {
          return undefined;
        }
        return data?.id ?? data?.tx_cloc ?? data?.locId ?? data?.locid;
      }
    }
  }
};

submodule('userId', locIdSubmodule);
