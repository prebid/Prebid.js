import {MODULE_TYPE_RTD} from '../src/activities/modules.js';
import {config} from '../src/config.js';
import {submodule} from '../src/hook.js';
import {deepAccess, mergeDeep, prefixLog} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';

const MODULE_NAME = 'optable';
export const LOG_PREFIX = `[${MODULE_NAME} RTD]:`;
const optableLog = prefixLog(LOG_PREFIX);
const {logMessage, logWarn, logError} = optableLog;
const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME});

// localStorage key for targeting cache
const OPTABLE_CACHE_KEY = 'optable-cache:targeting';

// Storage key prefix for passport (visitor ID) - matches Web SDK format
const PASSPORT_KEY_PREFIX = 'OPTABLE_PASSPORT_';

/**
 * Extracts the parameters for Optable RTD module from the config object passed at instantiation
 * @param {Object} moduleConfig Configuration object for the module
 * @returns {Object} Parsed configuration
 */
export const parseConfig = (moduleConfig) => {
  // Required parameters
  const host = deepAccess(moduleConfig, 'params.host', null);
  const site = deepAccess(moduleConfig, 'params.site', null);
  const node = deepAccess(moduleConfig, 'params.node', null);

  // Validate required parameters
  if (!host || typeof host !== 'string') {
    logError('host parameter is required and must be a string');
    return null;
  }
  if (!site || typeof site !== 'string') {
    logError('site parameter is required and must be a string');
    return null;
  }
  if (!node || typeof node !== 'string') {
    logError('node parameter is required and must be a string');
    return null;
  }

  // Optional parameters
  const cookies = deepAccess(moduleConfig, 'params.cookies', true);
  const timeout = deepAccess(moduleConfig, 'params.timeout', null);
  const cacheFallbackTimeout = deepAccess(moduleConfig, 'params.cacheFallbackTimeout', 150);
  const ids = deepAccess(moduleConfig, 'params.ids', []);
  const hids = deepAccess(moduleConfig, 'params.hids', []);
  const handleRtd = deepAccess(moduleConfig, 'params.handleRtd', null);

  // Validate handleRtd if provided
  if (handleRtd && typeof handleRtd !== 'function') {
    logError('handleRtd must be a function');
    return null;
  }

  // Validate ids and hids are arrays
  if (!Array.isArray(ids)) {
    logError('ids parameter must be an array');
    return null;
  }
  if (!Array.isArray(hids)) {
    logError('hids parameter must be an array');
    return null;
  }

  return {
    host: host.trim(),
    site: site.trim(),
    node: node.trim(),
    cookies,
    timeout,
    cacheFallbackTimeout,
    ids,
    hids,
    handleRtd
  };
}

// Global session ID (generated once per page load)
let sessionID = null;

/**
 * Generates a random session ID (base64url encoded 16-byte random value)
 * @returns {string} Session ID
 */
export const generateSessionID = () => {
  if (sessionID) {
    return sessionID;
  }

  // Generate 16 random bytes
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);

  // Convert to base64url (URL-safe, no padding)
  sessionID = btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return sessionID;
};

/**
 * Base64 encode a string
 * @param {string} str String to encode
 * @returns {string} Base64 encoded string
 */
const encodeBase64 = (str) => {
  return btoa(str);
};

/**
 * Generate storage key for passport based on host/node
 * @param {string} host DCN host
 * @param {string} node Node identifier
 * @returns {string} Storage key
 */
const generatePassportKey = (host, node) => {
  const base = `${host}/${node}`;
  return `${PASSPORT_KEY_PREFIX}${encodeBase64(base)}`;
};

/**
 * Get passport from localStorage
 * @param {string} host DCN host
 * @param {string} node Node identifier
 * @returns {string|null} Passport value or null
 */
export const getPassport = (host, node) => {
  const key = generatePassportKey(host, node);
  return storage.getDataFromLocalStorage(key);
};

/**
 * Set passport in localStorage
 * @param {string} host DCN host
 * @param {string} node Node identifier
 * @param {string} passport Passport value
 */
export const setPassport = (host, node, passport) => {
  const key = generatePassportKey(host, node);
  storage.setDataInLocalStorage(key, passport);
};

/**
 * Get cached targeting data from localStorage
 * @returns {Object|null} Cached targeting data or null
 */
const getCachedTargeting = () => {
  const cacheData = storage.getDataFromLocalStorage(OPTABLE_CACHE_KEY);
  if (cacheData) {
    try {
      const parsedData = JSON.parse(cacheData);
      const eidCount = parsedData?.ortb2?.user?.eids?.length || 0;
      logMessage(`Found cached targeting with ${eidCount} EIDs`);
      return eidCount > 0 ? parsedData : null;
    } catch (e) {
      logWarn('Failed to parse cached targeting', e);
    }
  }
  return null;
};

/**
 * Set targeting data in localStorage
 * @param {Object} targetingData Targeting response
 */
const setCachedTargeting = (targetingData) => {
  if (!targetingData || !targetingData.ortb2) {
    return;
  }
  storage.setDataInLocalStorage(OPTABLE_CACHE_KEY, JSON.stringify(targetingData));
};

/**
 * Read consent from CMP APIs directly (fallback when Prebid consent not available)
 * @returns {Object} Consent object
 */
const getConsentFromCMPAPIs = () => {
  const consent = {
    deviceAccess: true,
    gpp: null,
    gppSectionIDs: null,
    gdpr: null,
    gdprApplies: null
  };

  // Try to read from GPP CMP API
  if (typeof window.__gpp === 'function') {
    try {
      window.__gpp('ping', (data, success) => {
        if (success && data) {
          consent.gpp = data.gppString || null;
          consent.gppSectionIDs = data.applicableSections || null;
        }
      });
    } catch (e) {
      logWarn('Failed to read GPP consent from CMP API', e);
    }
  }

  // Try to read from TCF CMP API
  if (typeof window.__tcfapi === 'function') {
    try {
      window.__tcfapi('getTCData', 2, (data, success) => {
        if (success && data) {
          consent.gdpr = data.tcString || null;
          consent.gdprApplies = data.gdprApplies;
          // TCF Purpose 1 = device access and storage
          // Check both vendor consents and publisher consents
          const purpose1Consent = data.purpose?.consents?.[1] || data.publisher?.consents?.[1];
          consent.deviceAccess = purpose1Consent !== undefined ? purpose1Consent : true;
        }
      });
    } catch (e) {
      logWarn('Failed to read TCF consent from CMP API', e);
    }
  }

  return consent;
};

/**
 * Extract consent information from Prebid config (with fallback to CMP APIs)
 * @returns {Object} Consent object with GPP, GDPR strings, and deviceAccess flag
 */
const getConsentFromPrebid = () => {
  const consent = {
    deviceAccess: true,
    gpp: null,
    gppSectionIDs: null,
    gdpr: null,
    gdprApplies: null
  };

  // Try to get GPP consent from Prebid
  const gppConsent = config.getConfig('consentManagement.gpp');
  if (gppConsent) {
    consent.gpp = gppConsent.gppString || null;
    consent.gppSectionIDs = gppConsent.applicableSections || null;
  }

  // Try to get GDPR consent from Prebid
  const gdprConsent = config.getConfig('consentManagement.gdpr');
  if (gdprConsent && gdprConsent.gdprApplies !== undefined) {
    consent.gdprApplies = gdprConsent.gdprApplies;
    consent.gdpr = gdprConsent.consentString || null;

    // Compute deviceAccess from TCF Purpose 1 if available
    if (gdprConsent.vendorData) {
      const purpose1Consent = gdprConsent.vendorData.purpose?.consents?.[1] ||
                              gdprConsent.vendorData.publisher?.consents?.[1];
      if (purpose1Consent !== undefined) {
        consent.deviceAccess = purpose1Consent;
      }
    }
  }

  // If Prebid consent is empty, try CMP APIs directly
  // This handles the case where RTD runs before consent modules initialize
  if (!consent.gpp && !consent.gdpr) {
    return getConsentFromCMPAPIs();
  }

  return consent;
};

/**
 * Extract user identifiers from config and Prebid userId module
 * @param {Array} configIds IDs from module config
 * @param {Array} configHids HIDs from module config
 * @param {Object} reqBidsConfigObj Bid request configuration
 * @returns {Object} Object with ids and hids arrays
 */
const extractIdentifiers = (configIds, configHids, reqBidsConfigObj) => {
  const ids = [...configIds];
  const hids = [...configHids];

  // Note: We don't extract IDs from Prebid userId module (ortb2.user.ext.eids)
  // because those are in ORTB format, not Optable's ID format (e:hash, c:ppid, etc.)
  // Optable-specific IDs should be provided via params.ids configuration

  // Add default __passport__ ID if no other IDs provided
  // This allows targeting to work with just passport + IP enrichment
  if (ids.length === 0) {
    ids.push('__passport__');
  }

  return { ids, hids };
};

/**
 * Build targeting API request URL with all query parameters
 * @param {Object} params Parameters object
 * @returns {string} Complete URL for targeting API
 */
const buildTargetingURL = (params) => {
  const {host, site, node, ids, hids, consent, sessionId, passport, cookies, timeout} = params;

  const searchParams = new URLSearchParams();

  // Add identifiers
  ids.forEach(id => searchParams.append('id', id));
  hids.forEach(hid => searchParams.append('hid', hid));

  // Add site identifier (required)
  searchParams.set('o', site);

  // Add node identifier (required)
  searchParams.set('t', node);

  // Add session ID (for analytics)
  searchParams.set('sid', sessionId);

  // Add SDK identifier (for server-side analytics)
  searchParams.set('osdk', 'prebid-rtd-1.0.0');

  // Add consent parameters
  if (consent.gpp) {
    searchParams.set('gpp', consent.gpp);
  }
  if (consent.gppSectionIDs && Array.isArray(consent.gppSectionIDs)) {
    searchParams.set('gpp_sid', consent.gppSectionIDs.join(','));
  }
  if (consent.gdpr) {
    searchParams.set('gdpr_consent', consent.gdpr);
  }
  if (consent.gdprApplies !== null && consent.gdprApplies !== undefined) {
    searchParams.set('gdpr', consent.gdprApplies ? '1' : '0');
  }

  // Add cookie mode and passport
  if (cookies) {
    searchParams.set('cookies', 'yes');
  } else {
    searchParams.set('cookies', 'no');
    searchParams.set('passport', passport || '');
  }

  // Add timeout hint if provided
  if (timeout) {
    searchParams.set('timeout', timeout);
  }

  const url = `https://${host}/v2/targeting?${searchParams.toString()}`;
  return url;
};

/**
 * Call the targeting API and return the response
 * @param {Object} params Configuration parameters
 * @returns {Promise<Object|null>} Targeting response or null
 */
const callTargetingAPI = (params) => {
  return new Promise((resolve) => {
    const url = buildTargetingURL(params);
    const {host, node} = params;

    logMessage(`Calling targeting API: ${url.split('?')[0]}`);

    const ajaxOptions = {
      method: 'GET',
      withCredentials: params.consent.deviceAccess,
      success: (responseText) => {
        try {
          const response = JSON.parse(responseText);
          const eidCount = response?.ortb2?.user?.eids?.length || 0;
          logMessage(`Targeting API returned ${eidCount} EIDs`);

          // Update passport if present in response
          if (response.passport) {
            logMessage('Updating passport from API response');
            setPassport(host, node, response.passport);
            // Remove passport from response to prevent it leaking into targeting
            delete response.passport;
          }

          resolve(response);
        } catch (e) {
          logError('Failed to parse targeting API response', e);
          resolve(null);
        }
      },
      error: (error) => {
        logError('Targeting API call failed', error);
        resolve(null);
      }
    };

    ajax(url, ajaxOptions);
  });
};

/**
 * Default function to handle/enrich RTD data by merging targeting data into ortb2
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Object} targetingData Targeting data from API
 * @param {Function} mergeFn Function to merge data
 * @returns {void}
 */
export const defaultHandleRtd = (reqBidsConfigObj, targetingData, mergeFn) => {
  if (!targetingData || !targetingData.ortb2) {
    logWarn('No targeting data found');
    return;
  }

  mergeFn(
    reqBidsConfigObj.ortb2Fragments.global,
    targetingData.ortb2,
  );
  logMessage('Prebid\'s global ORTB2 object after merge: ', reqBidsConfigObj.ortb2Fragments.global);
};

/**
 * Main function called by Prebid to get bid request data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {Object} moduleConfig Configuration for Optable RTD module
 * @param {Object} userConsent User consent object
 */
export const getBidRequestData = async (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  try {
    // Parse and validate configuration
    const parsedConfig = parseConfig(moduleConfig);
    if (!parsedConfig) {
      logError('Invalid configuration, skipping Optable RTD');
      callback();
      return;
    }

    const {host, site, node, cookies, timeout, cacheFallbackTimeout, ids: configIds, hids: configHids, handleRtd} = parsedConfig;
    const handleRtdFn = handleRtd || defaultHandleRtd;

    logMessage(`Configuration: host=${host}, site=${site}, node=${node}, cookies=${cookies}`);

    // Generate session ID and extract consent (needed for both cache hit and miss)
    const sessionId = generateSessionID();
    const consent = getConsentFromPrebid();

    // Step 1: Check cache - if found, try API first with cache fallback
    const cachedData = getCachedTargeting();
    if (cachedData) {
      logMessage('Cache found, trying API-first with cache fallback');
      logMessage(`Cache fallback timeout: ${cacheFallbackTimeout}ms`);

      // Extract identifiers from config and Prebid userId module
      const {ids, hids} = extractIdentifiers(configIds, configHids, reqBidsConfigObj);
      logMessage(`Identifiers: ${ids.length} id(s), ${hids.length} hid(s)`);

      // Get passport from localStorage
      const passport = getPassport(host, node);
      logMessage(`Passport: ${passport ? 'found' : 'not found'}`);

      // Start API call
      const apiPromise = callTargetingAPI({
        host,
        site,
        node,
        ids,
        hids,
        consent,
        sessionId,
        passport,
        cookies,
        timeout
      });

      // Create timeout promise
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(null), cacheFallbackTimeout);
      });

      // Race API call against timeout
      const targetingData = await Promise.race([apiPromise, timeoutPromise]);

      if (targetingData) {
        // API returned in time - use fresh data
        logMessage('API returned in time, using fresh targeting data');
        handleRtdFn(reqBidsConfigObj, targetingData, mergeDeep);

        // Update cache and passport
        setCachedTargeting(targetingData);
        if (targetingData.passport) {
          setPassport(host, node, targetingData.passport);
        }

        callback();
      } else {
        // Timeout - use cached data but keep waiting for API
        logMessage('Timeout reached, using cached targeting data');
        handleRtdFn(reqBidsConfigObj, cachedData, mergeDeep);
        callback();

        // Continue waiting for API to update cache in background
        logMessage('Waiting for API to complete in background to update cache');
        apiPromise.then(data => {
          if (data) {
            logMessage('Background API call completed, cache updated');
            setCachedTargeting(data);
            if (data.passport) {
              setPassport(host, node, data.passport);
            }
          }
        }).catch(error => {
          logWarn('Background API call failed:', error);
        });
      }

      return;
    }

    // Step 2: No cache found - make targeting API call
    logMessage(`Session ID: ${sessionId}`);
    logMessage(`Consent: GPP=${!!consent.gpp}, GDPR=${!!consent.gdpr}`);

    // Extract identifiers from config and Prebid userId module
    const {ids, hids} = extractIdentifiers(configIds, configHids, reqBidsConfigObj);
    logMessage(`Identifiers: ${ids.length} id(s), ${hids.length} hid(s)`);

    // Get passport from localStorage
    const passport = getPassport(host, node);
    logMessage(`Passport: ${passport ? 'found' : 'not found'}`);

    // Call targeting API
    const targetingData = await callTargetingAPI({
      host,
      site,
      node,
      ids,
      hids,
      consent,
      sessionId,
      passport,
      cookies,
      timeout
    });

    if (!targetingData) {
      logWarn('No targeting data returned from API');
      callback();
      return;
    }

    // Step 3: Cache the response
    setCachedTargeting(targetingData);

    // Step 4: Merge targeting data into bid request
    handleRtdFn(reqBidsConfigObj, targetingData, mergeDeep);

    callback();
  } catch (error) {
    // If an error occurs, log it and call the callback to continue with the auction
    logError('getBidRequestData error: ', error);
    callback();
  }
}

/**
 * Get Optable targeting data and merge it into the ad units
 * Note: Ad server targeting requires the Optable Web SDK. This RTD module
 * focuses on enriching bid requests with EIDs. For ad server targeting,
 * please use the Optable Web SDK alongside this RTD module.
 *
 * @param adUnits Array of ad units
 * @param moduleConfig Module configuration
 * @param userConsent User consent
 * @param auction Auction object
 * @returns {Object} Empty object (ad server targeting not supported without Web SDK)
 */
export const getTargetingData = (adUnits, moduleConfig, userConsent, auction) => {
  logMessage('getTargetingData: Ad server targeting not supported in direct API mode');
  logMessage('For ad server targeting, please use the Optable Web SDK');
  return {};
};

/**
 * Dummy init function
 * @param {Object} config Module configuration
 * @param {boolean} userConsent User consent
 * @returns true
 */
const init = (config, userConsent) => {
  return true;
}

// Optable RTD submodule
export const optableSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
  getTargetingData,
}

// Register the Optable RTD submodule
submodule('realTimeData', optableSubmodule);
