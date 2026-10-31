import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
import { config } from '../src/config.js';
import { submodule } from '../src/hook.js';
import { deepAccess, mergeDeep, prefixLog } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * @typedef {import('./optableRtdProvider.d.ts').OptableRtdProviderConfig} OptableRtdProviderConfig
 * @typedef {import('./optableRtdProvider.d.ts').OptableRtdProviderParams} OptableRtdProviderParams
 * @typedef {import('./optableRtdProvider.d.ts').OptableRtdConfig} OptableRtdConfig
 * @typedef {import('./optableRtdProvider.d.ts').OptableHandleRtd} OptableHandleRtd
 * @typedef {import('./optableRtdProvider.d.ts').OptableTargetingHandleRtd} OptableTargetingHandleRtd
 * @typedef {import('./optableRtdProvider.d.ts').OptableMergeFn} OptableMergeFn
 */

const MODULE_NAME = 'optable';
export const LOG_PREFIX = `[${MODULE_NAME} RTD]:`;
const optableLog = prefixLog(LOG_PREFIX);
const { logMessage, logWarn, logError } = optableLog;
export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME });

export const dep = {
  ajax
};

const RTD_MODULE_VARIANT = 'optable-rtd-1.0.0';
const OPTABLE_CACHE_KEY = 'optable-cache:targeting';
const PASSPORT_KEY_PREFIX = 'OPTABLE_PASSPORT_';
const UID2_SOURCE = 'uidapi.com';

/**
 * Extracts the parameters for Optable RTD module from the config object passed at instantiation
 * @param {OptableRtdProviderConfig} moduleConfig Configuration object for the module
 * @returns {OptableRtdProviderParams}
 */
export const parseConfig = (moduleConfig) => {
  let bundleUrl = deepAccess(moduleConfig, 'params.bundleUrl', null);
  const adserverTargeting = deepAccess(moduleConfig, 'params.adserverTargeting', true);
  const handleRtd = deepAccess(moduleConfig, 'params.handleRtd', null);
  const instance = deepAccess(moduleConfig, 'params.instance', null);

  // If present, trim the bundle URL
  if (typeof bundleUrl === 'string') {
    bundleUrl = bundleUrl.trim();
  }

  // Verify that bundleUrl is a valid URL: only secure (HTTPS) URLs are allowed
  if (typeof bundleUrl === 'string' && bundleUrl.length && !bundleUrl.startsWith('https://')) {
    logError('Invalid URL format for bundleUrl in moduleConfig. Only HTTPS URLs are allowed.');
    return { bundleUrl: null, adserverTargeting, handleRtd: null };
  }

  if (handleRtd && typeof handleRtd !== 'function') {
    logError('handleRtd must be a function');
    return { bundleUrl, adserverTargeting, handleRtd: null };
  }

  const result = { bundleUrl, adserverTargeting, handleRtd };
  if (instance !== null) {
    result.instance = instance;
  }
  return result;
};

/**
 * @param {OptableRtdProviderConfig} moduleConfig Configuration object for the module
 * @returns {boolean} True when the targeting flow is enabled
 */
export const isTargetingEnabled = (moduleConfig) => deepAccess(moduleConfig, 'params.enableTargeting', false) === true;

/**
 * Parse and validate module configuration for the targeting flow
 * @param {OptableRtdProviderConfig} moduleConfig Configuration object for the module
 * @returns {Object|null} Parsed configuration, or null when invalid
 */
export const parseTargetingConfig = (moduleConfig) => {
  if (deepAccess(moduleConfig, 'params.bundleUrl', null)) {
    logWarn('bundleUrl is ignored when enableTargeting is set');
  }

  const host = deepAccess(moduleConfig, 'params.host', null);
  const node = deepAccess(moduleConfig, 'params.node', null);
  const site = deepAccess(moduleConfig, 'params.site', null);
  const adserverTargeting = deepAccess(moduleConfig, 'params.adserverTargeting', true);
  const instance = deepAccess(moduleConfig, 'params.instance', null);

  const hasDirectApiConfig = !!(host && node && site);

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
  const skipMergeIfUid2Exists = deepAccess(moduleConfig, 'params.skipMergeIfUid2Exists', false);

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
    hasDirectApiConfig,
    skipMergeIfUid2Exists
  };
};

/**
 * Wait for Optable SDK event to fire with targeting data
 * @param {string} eventName Name of the event to listen for
 * @param {string|null} instance SDK instance name (default: 'instance')
 * @returns {Promise<Object|null>} Promise that resolves with targeting data or null
 */
const waitForOptableEvent = (eventName, instance = null) => {
  return new Promise((resolve) => {
    const optableBundle = /** @type {Object} */ (window.optable);
    const cachedData = optableBundle?.[instance || 'instance']?.targetingFromCache?.();

    if (cachedData && cachedData.ortb2) {
      logMessage('Optable SDK already has cached data');
      resolve(cachedData);
      return;
    }

    const eventListener = (event) => {
      logMessage(`Received ${eventName} event`);
      // Extract targeting data from event detail
      const targetingData = event.detail;
      window.removeEventListener(eventName, eventListener);
      resolve(targetingData);
    };

    window.addEventListener(eventName, eventListener);
    logMessage(`Waiting for ${eventName} event`);
  });
};

/**
 * Default function to handle/enrich RTD data
 * @type {OptableHandleRtd}
 */
export const defaultHandleRtd = async (reqBidsConfigObj, optableExtraData, mergeFn) => {
  // Wait for the Optable SDK to dispatch targeting data via event
  let targetingData = await waitForOptableEvent('optable-targeting:change');

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
 * Get data from Optable and merge it into the global ORTB2 object
 * @param {OptableHandleRtd} handleRtdFn Function to handle RTD data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {OptableRtdConfig} optableExtraData Additional data to be used by the Optable SDK
 * @param {OptableMergeFn} mergeFn Function to merge data
 */
export const mergeOptableData = async (handleRtdFn, reqBidsConfigObj, optableExtraData, mergeFn) => {
  if (handleRtdFn.constructor.name === 'AsyncFunction') {
    await handleRtdFn(reqBidsConfigObj, optableExtraData, mergeFn);
  } else {
    handleRtdFn(reqBidsConfigObj, optableExtraData, mergeFn);
  }
};

let sessionID = null;
let targetingRequest = null;

/**
 * Generates a random session ID (base64url encoded 16-byte random value), once per page load
 * @returns {string} Session ID
 */
export const generateSessionID = () => {
  if (sessionID) {
    return sessionID;
  }

  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);

  sessionID = btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return sessionID;
};

/**
 * Base64 encode a string using UTF-16LE encoding, matching the Web SDK storage keys
 * @param {string} str String to encode
 * @returns {string} Base64 encoded string
 */
const encodeBase64 = (str) => {
  const codeUnits = new Uint16Array(str.length);
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = str.charCodeAt(i);
  }
  return btoa(String.fromCharCode(...new Uint8Array(codeUnits.buffer)));
};

/**
 * @param {string} host DCN host
 * @param {string} node Node identifier
 * @returns {string} Passport storage key
 */
const generatePassportKey = (host, node) => `${PASSPORT_KEY_PREFIX}${encodeBase64(`${host}/${node}`)}`;

/**
 * Get passport from localStorage
 * @param {string} host DCN host
 * @param {string} node Node identifier
 * @returns {string|null} Passport value or null
 */
export const getPassport = (host, node) => {
  return storage.getDataFromLocalStorage(generatePassportKey(host, node));
};

/**
 * Set passport in localStorage
 * @param {string} host DCN host
 * @param {string} node Node identifier
 * @param {string} passport Passport value
 */
export const setPassport = (host, node, passport) => {
  storage.setDataInLocalStorage(generatePassportKey(host, node), passport);
};

/**
 * @param {string} host DCN host
 * @param {string} node Node identifier
 * @returns {string} Web SDK targeting cache key
 */
const generateSDKTargetingKey = (host, node) => `OPTABLE_TARGETING_${encodeBase64(`${host}/${node}`)}`;

/**
 * @param {Object|null} targetingData Targeting response, or null when the call failed
 * @returns {boolean} True when the response should replace the cache: any successful
 * response does, even an empty one; a failed call keeps the previous entry
 */
const isCacheable = (targetingData) => !!targetingData;

/**
 * Write targeting data to the Web SDK cache key so targetingFromCache() can read it
 * @param {string} host DCN host
 * @param {string} node Node identifier
 * @param {Object} targetingData Targeting response
 */
const setSDKTargetingCache = (host, node, targetingData) => {
  if (!isCacheable(targetingData)) {
    return;
  }
  const key = generateSDKTargetingKey(host, node);
  storage.setDataInLocalStorage(key, JSON.stringify(targetingData));
  logMessage(`Updated SDK-compatible cache: ${key}`);
};

/**
 * Get cached targeting data from localStorage. Any cached response is served, empty
 * included, so the last successful answer never blocks the auction.
 * @returns {Object|null} Cached targeting data or null
 */
const getCachedTargeting = () => {
  const cacheData = storage.getDataFromLocalStorage(OPTABLE_CACHE_KEY);
  if (cacheData) {
    try {
      const parsedData = JSON.parse(cacheData);
      if (parsedData && typeof parsedData === 'object') {
        const eidCount = parsedData.ortb2?.user?.eids?.length || 0;
        logMessage(`Found cached targeting with ${eidCount} EIDs`);
        return parsedData;
      }
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
  if (!isCacheable(targetingData)) {
    return;
  }
  storage.setDataInLocalStorage(OPTABLE_CACHE_KEY, JSON.stringify(targetingData));
};

/**
 * Drop the ext.optable.ref pointer from a uid, pruning ext objects left empty
 * @param {Object} uid ORTB2 uid
 * @returns {Object} uid without the ref pointer
 */
const stripRefPointer = (uid) => {
  const optable = uid?.ext?.optable;
  if (!optable || optable.ref === undefined) {
    return uid;
  }
  const { ref, ...restOptable } = optable;
  const copy = { ...uid };
  if (Object.keys(restOptable).length) {
    copy.ext = { ...uid.ext, optable: restOptable };
  } else {
    const { optable: _optable, ...restExt } = uid.ext;
    if (Object.keys(restExt).length) {
      copy.ext = restExt;
    } else {
      delete copy.ext;
    }
  }
  return copy;
};

/**
 * Normalize a targeting response into the Web SDK cache format: refs keyed by
 * EID source, ext.optable.ref pointers and legacy _ref stripped from EIDs.
 * Idempotent and never mutates its input.
 * @param {Object} response Targeting response
 * @returns {Object} Response in cache format
 */
export const toCacheFormat = (response) => {
  const user = response?.ortb2?.user;
  const eids = Array.isArray(user?.eids) ? user.eids : [];
  const wireShaped = eids.some(eid => eid?.uids?.[0]?.ext?.optable?.ref !== undefined);
  let refs = { ...response.refs };
  if (wireShaped) {
    refs = {};
    eids.forEach(eid => {
      const refKey = eid?.uids?.[0]?.ext?.optable?.ref;
      if (refKey !== undefined && response.refs && Object.prototype.hasOwnProperty.call(response.refs, refKey)) {
        refs[eid.source] = response.refs[refKey];
      } else {
        delete refs[eid.source];
      }
    });
  }
  const copy = { ...response, refs };
  if (user?.eids) {
    copy.ortb2 = {
      ...response.ortb2,
      user: {
        ...user,
        eids: eids.map(({ _ref, ...eid }) => ({ ...eid, uids: (eid.uids || []).map(stripRefPointer) })),
      },
    };
  }
  return copy;
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
 * Handle RTD data from the Web SDK's targeting event
 * @param {OptableTargetingHandleRtd} handleRtdFn Custom handler function or default
 * @param {Object} reqBidsConfigObj Bid request configuration
 * @param {OptableMergeFn} mergeFn Merge function
 * @param {Object} options Options passed through to handleRtdFn
 * @param {string|null} instance SDK instance name
 * @returns {Promise<void>}
 */
const handleSDKMode = async (handleRtdFn, reqBidsConfigObj, mergeFn, options, instance) => {
  const targetingData = await waitForOptableEvent('optable-targeting:change', instance);

  if (!targetingData || !targetingData.ortb2) {
    logWarn('No targeting data from SDK event');
    return;
  }

  if (handleRtdFn.constructor.name === 'AsyncFunction') {
    await handleRtdFn(reqBidsConfigObj, targetingData, mergeFn, options);
  } else {
    handleRtdFn(reqBidsConfigObj, targetingData, mergeFn, options);
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

  if (userConsent?.gpp) {
    consent.gpp = userConsent.gpp.gppString || null;
    consent.gppSectionIDs = userConsent.gpp.applicableSections || null;
  }

  if (userConsent?.gdpr) {
    consent.gdprApplies = userConsent.gdpr.gdprApplies;
    consent.gdpr = userConsent.gdpr.consentString || null;

    // deviceAccess follows TCF Purpose 1 when GDPR applies
    if (userConsent.gdpr.gdprApplies) {
      consent.deviceAccess = userConsent.gdpr.vendorData?.purpose?.consents?.[1] === true;
    }
  }

  return consent;
};

/**
 * Build the identifier lists for the targeting call. Prebid userId EIDs are not
 * used since they are ORTB EIDs, not Optable identifiers (e:hash, c:ppid, ...).
 * @param {Array} configIds IDs from module config
 * @param {Array} configHids HIDs from module config
 * @returns {Object} Object with ids and hids arrays
 */
const extractIdentifiers = (configIds, configHids) => {
  const ids = [...configIds];
  const hids = [...configHids];

  // With no identifiers, target on the passport alone
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
  const { host, node, site, ids, hids, consent, sessionId, passport, cookies, timeout } = params;

  const searchParams = new URLSearchParams();

  ids.forEach(id => searchParams.append('id', id));
  hids.forEach(hid => searchParams.append('hid', hid));

  searchParams.set('o', site);
  searchParams.set('t', node);
  searchParams.set('sid', sessionId);
  searchParams.set('osdk', RTD_MODULE_VARIANT);

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

  return `https://${host}/v2/targeting?${searchParams.toString()}`;
};

/**
 * Call the targeting API and return the response in cache format
 * @param {Object} params Configuration parameters
 * @returns {Promise<Object|null>} Targeting response or null
 */
const callTargetingAPI = (params) => {
  return new Promise((resolve) => {
    const url = buildTargetingURL(params);
    const { host, node } = params;

    logMessage(`Calling targeting API: ${url.split('?')[0]}`);

    dep.ajax(url, {
      success: (responseText) => {
        try {
          const response = JSON.parse(responseText);
          const eidCount = response?.ortb2?.user?.eids?.length || 0;
          logMessage(`Targeting API returned ${eidCount} EIDs`);

          // The passport must not reach bid requests
          if (response.passport) {
            setPassport(host, node, response.passport);
            delete response.passport;
          }

          resolve(toCacheFormat(response));
        } catch (e) {
          logError('Failed to parse targeting API response', e);
          resolve(null);
        }
      },
      error: (error) => {
        logError('Targeting API call failed', error);
        resolve(null);
      }
    }, null, { method: 'GET', withCredentials: params.consent.deviceAccess });
  });
};

/**
 * Call the targeting API once per page load and update both caches. Concurrent
 * auctions share the request; a failed call is retried by the next auction.
 * @param {Object} apiParams Targeting API parameters
 * @returns {Promise<Object|null>} Targeting response or null
 */
const fetchTargeting = (apiParams) => {
  if (!targetingRequest) {
    targetingRequest = callTargetingAPI(apiParams).then(data => {
      if (data) {
        setCachedTargeting(data);
        setSDKTargetingCache(apiParams.host, apiParams.node, data);
      } else {
        targetingRequest = null;
      }
      return data;
    });
  }
  return targetingRequest;
};

export function resetTargetingRequest() {
  targetingRequest = null;
}

/**
 * Check if UID2 EID exists in the given EIDs array
 * @param {Array} eids Array of EIDs to check
 * @returns {boolean} True if UID2 EID is present
 */
export const hasUid2Eid = (eids) => {
  if (!Array.isArray(eids)) {
    return false;
  }
  return eids.some(eid => eid.source === UID2_SOURCE);
};

/**
 * Default handler for the targeting flow: merges targeting data into ortb2
 * @type {OptableTargetingHandleRtd}
 */
export const targetingHandleRtd = (reqBidsConfigObj, targetingData, mergeFn, options = {}) => {
  if (!targetingData) {
    logWarn('No targeting data found');
    return;
  }

  if (targetingData.ortb2) {
    targetingData = toCacheFormat(targetingData);
    const { eids: optableEids, ...user } = targetingData.ortb2.user ?? {};
    const eidCount = optableEids?.length || 0;
    logMessage(`targetingHandleRtd: received targeting data with ${eidCount} EIDs`);

    let eids = optableEids;
    if (options.skipMergeIfUid2Exists && eids) {
      const globalUser = reqBidsConfigObj.ortb2Fragments?.global?.user;
      if (hasUid2Eid(globalUser?.ext?.eids) || hasUid2Eid(globalUser?.eids)) {
        eids = eids.filter(eid => eid.source !== UID2_SOURCE);
        logMessage(`UID2 EID already present, skipping ${eidCount - eids.length} Optable UID2 EID(s)`);
      }
    }

    // Prebid has already normalized EIDs to user.ext.eids by the time RTD runs
    mergeFn(reqBidsConfigObj.ortb2Fragments.global, {
      ...targetingData.ortb2,
      user: eids ? { ...user, ext: { ...user.ext, eids } } : user,
    });
    logMessage(`EIDs merged into ortb2Fragments.global.user.ext.eids (${eids?.length || 0} EIDs)`);
  }

  if (reqBidsConfigObj.adUnits && Array.isArray(reqBidsConfigObj.adUnits)) {
    reqBidsConfigObj.adUnits.forEach(adUnit => {
      adUnit.ortb2Imp = adUnit.ortb2Imp || {};
      adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
      adUnit.ortb2Imp.ext.optable = adUnit.ortb2Imp.ext.optable || {};
      adUnit.ortb2Imp.ext.optable.variant = RTD_MODULE_VARIANT;
      if (targetingData.split_test_assignment) {
        adUnit.ortb2Imp.ext.optable.splitTestAssignment = targetingData.split_test_assignment;
      }
    });
    logMessage(`Variant "${RTD_MODULE_VARIANT}" added to ${reqBidsConfigObj.adUnits.length} ad units`);
  }
};

/**
 * Targeting flow: use the Web SDK's targeting event when the SDK is on the page,
 * otherwise call the targeting API directly.
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {OptableRtdProviderConfig} moduleConfig Configuration for Optable RTD module
 * @param {Object} userConsent User consent
 * @param {number} timeout Timeout in ms from the RTD framework (auctionDelay)
 */
const getTargetingBidRequestData = async (reqBidsConfigObj, callback, moduleConfig, userConsent, timeout) => {
  try {
    const parsedConfig = parseTargetingConfig(moduleConfig);
    if (!parsedConfig) {
      logError('Invalid configuration, skipping Optable RTD');
      callback();
      return;
    }

    const { host, node, site, cookies, timeout: configTimeout, ids: configIds, hids: configHids, handleRtd, instance, hasDirectApiConfig, skipMergeIfUid2Exists } = parsedConfig;
    const handleRtdFn = handleRtd || targetingHandleRtd;
    const options = { skipMergeIfUid2Exists };

    if (isSDKAvailable(instance)) {
      logMessage('Optable Web SDK detected, waiting for SDK targeting event');
      await handleSDKMode(handleRtdFn, reqBidsConfigObj, mergeDeep, options, instance);
      callback();
      return;
    }

    if (!hasDirectApiConfig) {
      logError('Neither Web SDK nor direct API configuration found. Please configure host, node, and site parameters, or load the Optable Web SDK.');
      callback();
      return;
    }

    // Leave 100ms of the auction delay for the merge; the DCN expects a Go duration
    const effectiveTimeout = configTimeout ?? ((timeout && timeout > 100) ? `${timeout - 100}ms` : null);
    const sessionId = generateSessionID();
    const consent = extractConsent(userConsent);
    const { ids, hids } = extractIdentifiers(configIds, configHids);
    const passport = getPassport(host, node);
    const apiParams = { host, node, site, ids, hids, consent, sessionId, passport, cookies, timeout: effectiveTimeout };

    logMessage(`Direct API mode: host=${host}, node=${node}, site=${site}, cookies=${cookies}, timeout=${effectiveTimeout}`);

    // Serve the cache immediately and refresh it in the background, once per page load
    const cachedData = getCachedTargeting();
    if (cachedData) {
      fetchTargeting(apiParams);
      await handleRtdFn(reqBidsConfigObj, cachedData, mergeDeep, options);
      callback();
      return;
    }

    const startedAt = Date.now();
    const targetingData = await fetchTargeting(apiParams);

    if (!targetingData) {
      logWarn('No targeting data returned from API');
      callback();
      return;
    }

    // The RTD framework stops waiting after auctionDelay
    if (timeout && Date.now() - startedAt >= timeout) {
      logWarn('Targeting API answered after auctionDelay, cached for the next auction');
      callback();
      return;
    }

    await handleRtdFn(reqBidsConfigObj, targetingData, mergeDeep, options);
    callback();
  } catch (error) {
    logError('getBidRequestData error: ', error);
    callback();
  }
};

/**
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {OptableRtdProviderConfig} moduleConfig Configuration for Optable RTD module
 * @param {Object} userConsent
 * @param {number} timeout Timeout in ms from the RTD framework (auctionDelay)
 */
export const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent, timeout) => {
  if (isTargetingEnabled(moduleConfig)) {
    return getTargetingBidRequestData(reqBidsConfigObj, callback, moduleConfig, userConsent, timeout);
  }

  try {
    // Extract the bundle URL from the module configuration
    const { bundleUrl, handleRtd } = parseConfig(moduleConfig);
    const handleRtdFn = handleRtd || defaultHandleRtd;
    const optableExtraData = config.getConfig('optableRtdConfig') || {};

    if (bundleUrl) {
      // If bundleUrl is present, load the Optable JS bundle
      // by using the loadExternalScript function
      logMessage('Custom bundle URL found in config: ', bundleUrl);

      // Load Optable JS bundle and merge the data
      loadExternalScript(bundleUrl, MODULE_TYPE_RTD, MODULE_NAME, () => {
        logMessage('Successfully loaded Optable JS bundle');
        mergeOptableData(handleRtdFn, reqBidsConfigObj, optableExtraData, mergeDeep).then(callback, callback);
      }, document);
    } else {
      // At this point, we assume that the Optable JS bundle is already
      // present on the page. If it is, we can directly merge the data
      // by passing the callback to the optable.cmd.push function.
      logMessage('Custom bundle URL not found in config. ' +
        'Assuming Optable JS bundle is already present on the page');
      window.optable = window.optable || { cmd: [] };
      window.optable.cmd.push(() => {
        logMessage('Optable JS bundle found on the page');
        mergeOptableData(handleRtdFn, reqBidsConfigObj, optableExtraData, mergeDeep).then(callback, callback);
      });
    }
  } catch (error) {
    // If an error occurs, log it and call the callback
    // to continue with the auction
    logError(error);
    callback();
  }
};

/**
 * Get Optable targeting data and merge it into the ad units
 * @param {string[]} adUnits Array of ad units
 * @param {OptableRtdProviderConfig} moduleConfig Module configuration
 * @param {Object} userConsent User consent
 * @param {Object} auction Auction object
 * @returns {Object} Targeting data
 */
export const getTargetingData = (adUnits, moduleConfig, userConsent, auction) => {
  // Extract `adserverTargeting` and `instance` from the module configuration
  const { adserverTargeting, instance } = parseConfig(moduleConfig);
  logMessage('Ad Server targeting: ', adserverTargeting);

  if (!adserverTargeting) {
    logMessage('Ad server targeting is disabled');
    return {};
  }

  const targetingData = {};
  // Resolve the SDK instance object based on the instance string
  // Default to 'instance' if not provided
  const instanceKey = instance || 'instance';
  const sdkInstance = window?.optable?.[instanceKey];
  if (!sdkInstance) {
    const log = isTargetingEnabled(moduleConfig) ? logMessage : logWarn;
    log(`No Optable SDK instance found for: ${instanceKey}`);
    return targetingData;
  }

  // Get the Optable targeting data from the cache
  const optableTargetingData = sdkInstance?.targetingKeyValuesFromCache?.() || targetingData;

  // If no Optable targeting data is found, return an empty object
  if (!Object.keys(optableTargetingData).length) {
    logWarn('No Optable targeting data found');
    return targetingData;
  }

  // Merge the Optable targeting data into the ad units
  adUnits.forEach(adUnit => {
    targetingData[adUnit] = targetingData[adUnit] || {};
    mergeDeep(targetingData[adUnit], optableTargetingData);
  });

  // If the key contains no data, remove it
  Object.keys(targetingData).forEach((adUnit) => {
    Object.keys(targetingData[adUnit]).forEach((key) => {
      if (!targetingData[adUnit][key] || !targetingData[adUnit][key].length) {
        delete targetingData[adUnit][key];
      }
    });

    // If the ad unit contains no data, remove it
    if (!Object.keys(targetingData[adUnit]).length) {
      delete targetingData[adUnit];
    }
  });

  logMessage('Optable targeting data: ', targetingData);
  return targetingData;
};

/**
 * @param {OptableRtdProviderConfig} config Module configuration
 * @param {Object} userConsent User consent
 * @returns {true}
 */
const init = (config, userConsent) => {
  if (isTargetingEnabled(config)) {
    getGlobal()._optableRtdVariant = RTD_MODULE_VARIANT;
    if (window.optable) {
      window.optable.optableRtdVariant = RTD_MODULE_VARIANT;
    }
    logMessage('Optable RTD targeting enabled', RTD_MODULE_VARIANT);
  }
  return true;
};

// Optable RTD submodule
export const optableSubmodule = {
  name: MODULE_NAME,
  disclosureURL: 'local://modules/optableRtdProvider.json',
  init,
  getBidRequestData,
  getTargetingData,
};

// Register the Optable RTD submodule
submodule('realTimeData', optableSubmodule);
