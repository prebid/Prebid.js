/**
 * This module adds LocID to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/locIdSystem
 * @requires module:modules/userId
 */

import { logWarn, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { gppDataHandler, uspDataHandler } from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';

const MODULE_NAME = 'locid';
const LOG_PREFIX = 'LocID:';
const DEFAULT_TIMEOUT_MS = 800;
const DEFAULT_EID_SOURCE = 'locid.com';
// OpenRTB EID atype: 3384 = LocID vendor identifier for demand partner recognition
const DEFAULT_EID_ATYPE = 3384;
// IAB TCF Global Vendor List ID for Digital Envoy
const GVLID = 3384;
const MAX_ID_LENGTH = 512;

/**
 * Normalizes privacy mode config to a boolean flag.
 * Supports both requirePrivacySignals (boolean) and privacyMode (string enum).
 * @param {Object} params - config.params
 * @returns {boolean} true if privacy signals are required, false otherwise
 */
function shouldRequirePrivacySignals(params) {
  if (params?.requirePrivacySignals === true) {
    return true;
  }
  if (params?.privacyMode === 'requireSignals') {
    return true;
  }
  // Default: allowWithoutSignals
  return false;
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
 * - uspConsent (US Privacy string)
 * - gppConsent (GPP consent data)
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
  if (consentData?.uspConsent) {
    return true;
  }

  // Check GPP consent
  if (consentData?.gppConsent) {
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
  return typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH;
}

/**
 * Reads a vendor flag from flags collection.
 * Supports plain object lookup (flags[id]) or function lookup (flags(id)).
 * @param {Object|Function} flags - The consents or legitimateInterests collection
 * @param {number} id - The vendor ID to look up
 * @returns {boolean|undefined} The flag value, or undefined if not accessible
 */
function readVendorFlag(flags, id) {
  if (typeof flags === 'function') {
    return flags(id);
  }
  if (flags && typeof flags === 'object') {
    return flags[id];
  }
  return undefined;
}

/**
 * Checks if vendor permission (consent or legitimate interest) is granted for our gvlid.
 * Returns true if permission is granted, false if denied, undefined if cannot be determined.
 */
function checkVendorPermission(vendorData) {
  if (!vendorData) {
    return undefined;
  }

  const vendor = vendorData.vendor;
  if (!vendor) {
    return undefined;
  }

  // TCF v2: Check vendor consent (purpose 1 typically required for identifiers)
  const vendorConsent = readVendorFlag(vendor.consents, GVLID);
  if (vendorConsent === true) {
    return true;
  }

  // TCF v2: Check legitimate interest as fallback
  const vendorLI = readVendorFlag(vendor.legitimateInterests, GVLID);
  if (vendorLI === true) {
    return true;
  }

  // vendorData.vendor exists but no permission found, deny
  return false;
}

/**
 * Checks privacy framework signals. Returns true if ID operations are allowed.
 *
 * LocID operates under Legitimate Interest and does not require a TCF consent
 * string when no privacy framework is present. When privacy signals exist,
 * vendor permission is enforced.
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

  // A) Privacy signals ARE present - enforce existing logic exactly
  //
  // Note: We only reach this point if actual CMP artifacts exist (consentString
  // or vendorData). gdprApplies alone does not trigger this path - see
  // hasPrivacySignals() for rationale. This supports LI-based operation where
  // a publisher may indicate GDPR jurisdiction without having a CMP.

  // Check GDPR - support both flat and nested shapes
  const gdprApplies = consentData?.gdprApplies === true || consentData?.gdpr?.gdprApplies === true;
  const consentString = consentData?.consentString || consentData?.gdpr?.consentString;
  const vendorData = consentData?.vendorData || consentData?.gdpr?.vendorData;

  if (gdprApplies) {
    // When GDPR applies AND we have CMP signals, require consentString
    if (!consentString || consentString.length === 0) {
      logWarn(LOG_PREFIX, 'GDPR framework data missing consent string');
      return false;
    }

    // Check vendor-level permission if vendorData is available
    const vendorPermission = checkVendorPermission(vendorData);
    if (vendorPermission === false) {
      logWarn(LOG_PREFIX, 'GDPR framework indicates vendor permission restriction for gvlid', GVLID);
      return false;
    }
    if (vendorPermission === undefined) {
      logWarn(LOG_PREFIX, 'GDPR vendorData not available; vendor permission check skipped');
    }
  }

  // Check USP consent
  const uspData = consentData?.uspConsent ?? uspDataHandler.getConsentData();
  if (uspData && uspData.length >= 3 && uspData.charAt(2) === 'Y') {
    logWarn(LOG_PREFIX, 'US Privacy framework processing restriction detected');
    return false;
  }

  // Check GPP consent
  const gppData = consentData?.gppConsent ?? gppDataHandler.getConsentData();
  if (gppData?.applicableSections?.includes(7) &&
      gppData?.parsedSections?.usnat?.KnownChildSensitiveDataConsents?.includes(1)) {
    logWarn(LOG_PREFIX, 'GPP usnat KnownChildSensitiveDataConsents processing restriction detected');
    return false;
  }

  return true;
}

/**
 * Extracts LocID from endpoint response.
 * Primary: tx_cloc, Fallback: stable_cloc
 */
function extractLocIdFromResponse(response) {
  if (!response) return null;

  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;

    // Primary: tx_cloc
    if (isValidId(parsed.tx_cloc)) {
      return parsed.tx_cloc;
    }

    // Fallback: stable_cloc
    if (isValidId(parsed.stable_cloc)) {
      return parsed.stable_cloc;
    }

    logWarn(LOG_PREFIX, 'Could not extract valid LocID from response');
    return null;
  } catch (e) {
    logError(LOG_PREFIX, 'Error parsing endpoint response:', e.message);
    return null;
  }
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
    withCredentials: params.withCredentials === true,
    timeout: timeoutMs
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
    const locId = extractLocIdFromResponse(response);
    safeCallback(locId || undefined);
  };

  const onError = (error) => {
    logWarn(LOG_PREFIX, 'Request failed:', error);
    safeCallback(undefined);
  };

  try {
    ajax(requestUrl, { success: onSuccess, error: onError }, null, requestOptions);
  } catch (e) {
    logError(LOG_PREFIX, 'Error initiating request:', e.message);
    safeCallback(undefined);
  }
}

export const locIdSubmodule = {
  name: MODULE_NAME,
  gvlid: GVLID,

  /**
   * Decode stored value into userId object.
   */
  decode(value) {
    const id = typeof value === 'object' ? value?.id : value;
    if (isValidId(id)) {
      return { locid: id };
    }
    return undefined;
  },

  /**
   * Get the LocID from endpoint.
   * Returns {id} for sync or {callback} for async per Prebid patterns.
   */
  getId(config, consentData, storedId) {
    const params = config?.params || {};

    // Check privacy restrictions first
    if (!hasValidConsent(consentData, params)) {
      return undefined;
    }

    // Reuse valid stored ID
    const existingId = typeof storedId === 'string' ? storedId : storedId?.id;
    if (existingId && isValidId(existingId)) {
      return { id: existingId };
    }

    // Return callback for async endpoint fetch
    return {
      callback: (callback) => {
        fetchLocIdFromEndpoint(config, callback);
      }
    };
  },

  /**
   * EID configuration following standard Prebid shape.
   */
  eids: {
    locid: {
      source: DEFAULT_EID_SOURCE,
      atype: DEFAULT_EID_ATYPE,
      getValue: function(data) {
        return typeof data === 'string' ? data : data?.locid;
      }
    }
  }
};

submodule('userId', locIdSubmodule);
