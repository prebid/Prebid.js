/**
 * Optable Real-Time Data (RTD) Provider Module for Prebid.js
 * See modules/optableRtdProvider.md for full documentation
 */

import {MODULE_TYPE_RTD} from '../src/activities/modules.js';
import {submodule} from '../src/hook.js';
import {deepAccess, mergeDeep, prefixLog} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';

const MODULE_NAME = 'optable';
export const LOG_PREFIX = `[${MODULE_NAME} RTD]:`;
const optableLog = prefixLog(LOG_PREFIX);
const {logMessage, logWarn, logError} = optableLog;
const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME});

// localStorage key for targeting cache (direct API mode only)
const OPTABLE_CACHE_KEY = 'optable-cache:targeting';

// Storage key prefix for passport (visitor ID) - compatible with Web SDK format
const PASSPORT_KEY_PREFIX = 'OPTABLE_PASSPORT_';

/**
 * Parse and validate module configuration
 * @param {Object} moduleConfig Configuration object for the module
 * @returns {Object} Parsed configuration
 */
export const parseConfig = (moduleConfig) => {
  // Check for deprecated bundleUrl parameter
  const bundleUrl = deepAccess(moduleConfig, 'params.bundleUrl', null);
  if (bundleUrl) {
    logError('bundleUrl parameter is no longer supported. Please either: (1) Load Optable SDK directly in your page HTML, OR (2) Switch to Direct API mode using host/node/site parameters. See documentation for details.');
    return null;
  }

  const host = deepAccess(moduleConfig, 'params.host', null);
  const node = deepAccess(moduleConfig, 'params.node', null);
  const site = deepAccess(moduleConfig, 'params.site', null);
  const adserverTargeting = deepAccess(moduleConfig, 'params.adserverTargeting', true);
  const instance = deepAccess(moduleConfig, 'params.instance', null);

  const hasDirectApiConfig = host && node && site;

  if (host !== null && (typeof host !== 'string' || !host.trim())) {
    logError('host parameter must be a non-empty string');
    return null;
  }
  if (node !== null && (typeof node !== 'string' || !node.trim())) {
    logError('node parameter must be a non-empty string');
    return null;
  }
  if (site !== null && (typeof site !== 'string' || !site.trim())) {
    logError('site parameter must be a non-empty string');
    return null;
  }

  const cookies = deepAccess(moduleConfig, 'params.cookies', true);
  const timeout = deepAccess(moduleConfig, 'params.timeout', null);
  const ids = deepAccess(moduleConfig, 'params.ids', []);
  const hids = deepAccess(moduleConfig, 'params.hids', []);
  const handleRtd = deepAccess(moduleConfig, 'params.handleRtd', null);

  if (handleRtd && typeof handleRtd !== 'function') {
    logError('handleRtd must be a function');
    return null;
  }

  if (!Array.isArray(ids)) {
    logError('ids parameter must be an array');
    return null;
  }
  if (!Array.isArray(hids)) {
    logError('hids parameter must be an array');
    return null;
  }

  return {
    host: host ? host.trim() : null,
    node: node ? node.trim() : null,
    site: site ? site.trim() : null,
    cookies,
    timeout,
    ids,
    hids,
    handleRtd,
    adserverTargeting,
    instance,
    hasDirectApiConfig
  };
}

// Global session ID (generated once per page load)
let sessionID = null;

// Track if we've made a targeting API call this session (to avoid redundant calls)
let targetingCallMade = false;

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
 * Check if Optable Web SDK is available on the page
 * @param {string|null} instance SDK instance name (default: 'instance')
 * @returns {boolean} True if SDK is available
 */
const isSDKAvailable = (instance = null) => {
  const instanceKey = instance || 'instance';
  return typeof window !== 'undefined' &&
         window.optable &&
         window.optable[instanceKey] &&
         typeof window.optable[instanceKey].targeting === 'function';
};

/**
 * Wait for Optable SDK event to fire with targeting data
 * @param {string} eventName Name of the event to listen for
 * @returns {Promise<Object|null>} Promise that resolves with targeting data or null
 */
const waitForOptableEvent = (eventName) => {
  return new Promise((resolve) => {
    const optableBundle = /** @type {Object} */ (window.optable);
    const cachedData = optableBundle?.instance?.targetingFromCache();

    if (cachedData && cachedData.ortb2) {
      logMessage('Optable SDK already has cached data');
      resolve(cachedData);
      return;
    }

    const eventListener = (event) => {
      logMessage(`Received ${eventName} event`);
      const targetingData = event.detail;
      window.removeEventListener(eventName, eventListener);
      resolve(targetingData);
    };

    window.addEventListener(eventName, eventListener);
    logMessage(`Waiting for ${eventName} event`);
  });
};

/**
 * Handle RTD data using SDK mode (event-based)
 * @param {Function} handleRtdFn Custom handler function or default
 * @param {Object} reqBidsConfigObj Bid request configuration
 * @param {Function} mergeFn Merge function
 * @returns {Promise<void>}
 */
const handleSDKMode = async (handleRtdFn, reqBidsConfigObj, mergeFn) => {
  const targetingData = await waitForOptableEvent('optable-targeting:change');

  if (!targetingData || !targetingData.ortb2) {
    logWarn('No targeting data from SDK event');
    return;
  }

  if (handleRtdFn.constructor.name === 'AsyncFunction') {
    await handleRtdFn(reqBidsConfigObj, targetingData, mergeFn);
  } else {
    handleRtdFn(reqBidsConfigObj, targetingData, mergeFn);
  }
};

/**
 * Extract consent information from Prebid's userConsent parameter
 * @param {Object} userConsent User consent object passed by Prebid RTD framework
 * @returns {Object} Consent object with GPP, GDPR strings, and deviceAccess flag
 */
const extractConsent = (userConsent) => {
  const consent = {
    deviceAccess: true,
    gpp: null,
    gppSectionIDs: null,
    gdpr: null,
    gdprApplies: null
  };

  // Extract GPP consent if available
  if (userConsent?.gpp) {
    consent.gpp = userConsent.gpp.gppString || null;
    consent.gppSectionIDs = userConsent.gpp.applicableSections || null;
  }

  // Extract GDPR consent if available
  if (userConsent?.gdpr) {
    consent.gdprApplies = userConsent.gdpr.gdprApplies;
    consent.gdpr = userConsent.gdpr.consentString || null;

    // Extract deviceAccess from TCF Purpose 1 if available
    if (userConsent.gdpr.vendorData) {
      const purpose1Consent = userConsent.gdpr.vendorData.purpose?.consents?.[1] ||
                              userConsent.gdpr.vendorData.publisher?.consents?.[1];
      if (purpose1Consent !== undefined) {
        consent.deviceAccess = purpose1Consent;
      }
    }
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
  const {host, node, site, ids, hids, consent, sessionId, passport, cookies, timeout} = params;

  const searchParams = new URLSearchParams();

  ids.forEach(id => searchParams.append('id', id));
  hids.forEach(hid => searchParams.append('hid', hid));

  searchParams.set('o', site);
  searchParams.set('t', node);
  searchParams.set('sid', sessionId);
  searchParams.set('osdk', 'prebid-rtd-1.0.0');

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

  if (cookies) {
    searchParams.set('cookies', 'yes');
  } else {
    searchParams.set('cookies', 'no');
    searchParams.set('passport', passport || '');
  }

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
            // Remove passport from response to prevent it being included in bid requests
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

  const eidCount = targetingData.ortb2?.user?.eids?.length || 0;
  logMessage(`defaultHandleRtd: received targeting data with ${eidCount} EIDs`);
  logMessage('Merging ortb2 data into global ORTB2 fragments...');

  mergeFn(
    reqBidsConfigObj.ortb2Fragments.global,
    targetingData.ortb2,
  );

  logMessage(`EIDs merged into ortb2Fragments.global.user.eids (${eidCount} EIDs)`);

  // Also add to user.ext.eids for additional coverage
  if (targetingData.ortb2.user?.eids) {
    const targetORTB2 = reqBidsConfigObj.ortb2Fragments.global;
    targetORTB2.user = targetORTB2.user ?? {};
    targetORTB2.user.ext = targetORTB2.user.ext ?? {};
    targetORTB2.user.ext.eids = targetORTB2.user.ext.eids ?? [];

    logMessage('Also merging Optable EIDs into ortb2.user.ext.eids...');

    // Merge EIDs into user.ext.eids
    targetingData.ortb2.user.eids.forEach(eid => {
      targetORTB2.user.ext.eids.push(eid);
    });

    logMessage(`EIDs also available in ortb2.user.ext.eids (${eidCount} EIDs)`);
  }

  // Add split_test_variant to adUnits ortb2Imp.ext.optable if present
  if (targetingData.split_test_variant) {
    logMessage(`Split test variant detected: ${targetingData.split_test_variant}`);

    if (reqBidsConfigObj.adUnits && Array.isArray(reqBidsConfigObj.adUnits)) {
      reqBidsConfigObj.adUnits.forEach(adUnit => {
        adUnit.ortb2Imp = adUnit.ortb2Imp || {};
        adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
        adUnit.ortb2Imp.ext.optable = adUnit.ortb2Imp.ext.optable || {};
        adUnit.ortb2Imp.ext.optable.splitTestVariant = targetingData.split_test_variant;
      });
      logMessage(`Split test variant added to ${reqBidsConfigObj.adUnits.length} ad units`);
    }
  }

  logMessage(`SUCCESS: ${eidCount} EIDs will be included in bid requests`);
};

/**
 * Main function called by Prebid to get bid request data
 * Automatically detects SDK mode or Direct API mode
 * @param {Object} reqBidsConfigObj Bid request configuration object from Prebid
 * @param {Function} callback Must be called when complete to continue auction
 * @param {Object} moduleConfig RTD module configuration from pbjs.setConfig()
 * @param {Object} userConsent User consent object from Prebid (GDPR/GPP/USP)
 * @param {number} timeout Timeout in ms from RTD framework (derived from auctionDelay config)
 */
export const getBidRequestData = async (reqBidsConfigObj, callback, moduleConfig, userConsent, timeout) => {
  try {
    const parsedConfig = parseConfig(moduleConfig);
    if (!parsedConfig) {
      logError('Invalid configuration, skipping Optable RTD');
      callback();
      return;
    }

    const {host, node, site, cookies, timeout: configTimeout, ids: configIds, hids: configHids, handleRtd, instance, hasDirectApiConfig} = parsedConfig;
    const handleRtdFn = handleRtd || defaultHandleRtd;

    // Mode 1: SDK mode - If Optable Web SDK is loaded (window.optable), use its event system
    // instead of making direct API calls. SDK handles caching, consent, and provides ad server targeting.
    if (isSDKAvailable(instance)) {
      logMessage('Optable Web SDK detected, using SDK mode');
      logMessage('Waiting for SDK to dispatch targeting data via event');

      await handleSDKMode(handleRtdFn, reqBidsConfigObj, mergeDeep);
      callback();
      return;
    }

    // Mode 2: Direct API mode - Make direct HTTP calls to Optable targeting API.
    // No ad server targeting support, but lighter weight (no external SDK required).
    if (!hasDirectApiConfig) {
      logError('Neither Web SDK nor direct API configuration found. Please configure host, node, and site parameters, or load the Optable Web SDK.');
      callback();
      return;
    }

    logMessage('Using direct API mode (SDK not detected)');

    const effectiveTimeout = (timeout && timeout > 100) ? timeout - 100 : configTimeout;

    logMessage(`Configuration: host=${host}, node=${node}, site=${site}, cookies=${cookies}`);
    if (effectiveTimeout) {
      logMessage(`Timeout: ${effectiveTimeout}ms${timeout ? ` (derived from auctionDelay: ${timeout}ms - 100ms)` : ' (from config)'}`);
    }

    const sessionId = generateSessionID();
    const consent = extractConsent(userConsent);

    logMessage(`Session ID: ${sessionId}`);
    logMessage(`Consent: GPP=${!!consent.gpp}, GDPR=${!!consent.gdpr}`);

    const {ids, hids} = extractIdentifiers(configIds, configHids, reqBidsConfigObj);
    logMessage(`Identifiers: ${ids.length} id(s), ${hids.length} hid(s)`);

    const passport = getPassport(host, node);
    logMessage(`Passport: ${passport ? 'found' : 'not found'}`);

    // Check if we have cached data - if so, use it immediately
    const cachedData = getCachedTargeting();
    if (cachedData) {
      logMessage('Cache found, using cached data');
      handleRtdFn(reqBidsConfigObj, cachedData, mergeDeep);
      callback();

      // Only refresh in background if we haven't made a call this session yet
      if (!targetingCallMade) {
        logMessage('First auction this session - refreshing cache in background');
        targetingCallMade = true;

        // Update cache in background (don't await)
        callTargetingAPI({
          host,
          node,
          site,
          ids,
          hids,
          consent,
          sessionId,
          passport,
          cookies,
          timeout: effectiveTimeout
        }).then(data => {
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
      } else {
        logMessage('Already made a targeting call this session - skipping refresh');
      }

      return;
    }

    // No cache - wait for API call
    logMessage('No cache found, waiting for API call');
    targetingCallMade = true;
    const targetingData = await callTargetingAPI({
      host,
      node,
      site,
      ids,
      hids,
      consent,
      sessionId,
      passport,
      cookies,
      timeout: effectiveTimeout
    });

    if (!targetingData) {
      logWarn('No targeting data returned from API');
      callback();
      return;
    }

    setCachedTargeting(targetingData);
    handleRtdFn(reqBidsConfigObj, targetingData, mergeDeep);

    callback();
  } catch (error) {
    logError('getBidRequestData error: ', error);
    callback();
  }
}

/**
 * Get Optable targeting data and merge it into the ad units
 * Only works when Optable Web SDK is present on the page
 *
 * @param adUnits Array of ad units
 * @param moduleConfig Module configuration
 * @param userConsent User consent
 * @param auction Auction object
 * @returns {Object} Targeting data (empty object if SDK not available)
 */
export const getTargetingData = (adUnits, moduleConfig, userConsent, auction) => {
  const parsedConfig = parseConfig(moduleConfig);
  if (!parsedConfig) {
    logWarn('Invalid configuration in getTargetingData');
    return {};
  }

  const {adserverTargeting, instance} = parsedConfig;

  if (!isSDKAvailable(instance)) {
    logMessage('getTargetingData: Web SDK not available, ad server targeting disabled');
    logMessage('For ad server targeting, please load the Optable Web SDK');
    return {};
  }

  if (!adserverTargeting) {
    logMessage('Ad server targeting is disabled via config');
    return {};
  }

  // Resolve the SDK instance object based on the instance string
  // Default to 'instance' if not provided
  const instanceKey = instance || 'instance';
  const sdkInstance = window?.optable?.[instanceKey];

  if (!sdkInstance || !sdkInstance.targetingKeyValuesFromCache) {
    logWarn(`No Optable SDK instance found for: ${instanceKey}`);
    return {};
  }

  const optableTargetingData = sdkInstance.targetingKeyValuesFromCache() || {};

  if (!Object.keys(optableTargetingData).length) {
    logWarn('No Optable targeting data found in SDK cache');
    return {};
  }

  const targetingData = {};
  adUnits.forEach(adUnit => {
    targetingData[adUnit] = targetingData[adUnit] || {};
    mergeDeep(targetingData[adUnit], optableTargetingData);
  });

  Object.keys(targetingData).forEach((adUnit) => {
    Object.keys(targetingData[adUnit]).forEach((key) => {
      if (!targetingData[adUnit][key] || !targetingData[adUnit][key].length) {
        delete targetingData[adUnit][key];
      }
    });

    // If the key contains no data, remove it
    if (!Object.keys(targetingData[adUnit]).length) {
      delete targetingData[adUnit];
    }
  });

  logMessage('Optable targeting data: ', targetingData);
  return targetingData;
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
