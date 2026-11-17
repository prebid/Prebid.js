import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
import { config } from '../src/config.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, mergeDeep, prefixLog } from '../src/utils.js';
import { ajax } from '../src/ajax.js';

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
const PASSPORT_KEY_PREFIX = 'OPTABLE_PASSPORT_';
const UID2_SOURCE = 'uidapi.com';

/** localStorage key where the Optable bundle caches resolved targeting data */
export const OPTABLE_RESOLVED_KEY = 'OPTABLE_RESOLVED';

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
  const cacheKey = deepAccess(moduleConfig, 'params.optableCacheTargeting', OPTABLE_RESOLVED_KEY);

  const hasDirectApiConfig = !!(host && node && site);

  if (typeof cacheKey !== 'string' || !cacheKey.trim()) {
    logError('optableCacheTargeting parameter must be a non-empty string');
    return null;
  }

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
    timeout: typeof timeout === 'number' ? `${timeout}ms` : timeout,
    ids,
    hids,
    handleRtd,
    adserverTargeting,
    instance,
    hasDirectApiConfig,
    skipMergeIfUid2Exists,
    cacheKey: cacheKey.trim()
  };
};

/**
 * Wait for Optable SDK event to fire with targeting data
 * @param {string} eventName Name of the event to listen for
 * @param {string|null} [instance] Property name of the SDK instance on `window.optable`
 * @param {number|null} [timeout] Stop waiting after this many ms (the RTD auctionDelay); no wait when unset or 0
 * @returns {Promise<Object|null>} Promise that resolves with targeting data or null
 */
const waitForOptableEvent = (eventName, instance = null, timeout = null) => {
  return new Promise((resolve) => {
    const optableBundle = /** @type {Object} */ (window.optable);
    const cachedData = optableBundle?.[instance || 'instance']?.targetingFromCache?.();

    // A split test holdout response carries the assignment without ortb2
    if (cachedData?.ortb2 || cachedData?.split_test_assignment) {
      logMessage('Optable SDK already has cached data');
      resolve(cachedData);
      return;
    }

    // The RTD framework passes 0 when it is not delaying the auction, so nothing would use a later event
    if (!timeout) {
      resolve(null);
      return;
    }

    let timer;
    const eventListener = (event) => {
      logMessage(`Received ${eventName} event`);
      clearTimeout(timer);
      window.removeEventListener(eventName, eventListener);
      resolve(event.detail);
    };

    window.addEventListener(eventName, eventListener);
    logMessage(`Waiting for ${eventName} event`);

    // The RTD framework stops waiting after auctionDelay; a later event would land in a released auction
    timer = setTimeout(() => {
      window.removeEventListener(eventName, eventListener);
      logWarn(`No ${eventName} event within ${timeout}ms`);
      resolve(null);
    }, timeout);
  });
};

/**
 * Whether the Optable bundle has loaded on the page
 * @param {string|null} [instance] Property name of the SDK instance on `window.optable`
 * @returns {boolean}
 */
const isBundleLoaded = (instance = null) => {
  const optableBundle = /** @type {Object} */ (window.optable);
  return typeof optableBundle?.rtd?.handleRtd === 'function' || !!optableBundle?.[instance || 'instance'];
};

/**
 * Move ORTB 2.6 `user.eids` to `user.ext.eids`, where Prebid's userId module
 * puts EIDs and where `userIdAsEids` reads them. Leaving them in `user.eids`
 * would also let the ORTB 2.5 translator overwrite `user.ext.eids` with them.
 * @param {Object} ortb2 ORTB2 object
 * @returns {Object} ORTB2 object with EIDs under `user.ext.eids`
 */
const toExtEids = (ortb2) => {
  if (!Array.isArray(ortb2?.user?.eids)) {
    return ortb2;
  }
  const { eids, ...user } = ortb2.user;
  const extEids = (user.ext?.eids ?? []).concat(eids);
  return { ...ortb2, user: { ...user, ext: { ...user.ext, eids: extEids } } };
};

/**
 * Drop `_`-prefixed keys from an EID: cache-only metadata the bundles keep on it,
 * like `_ref` (UID2 refresh material) and `_id5`, that must not reach bidders.
 * @param {Object} eid ORTB2 EID
 * @returns {Object} EID without `_`-prefixed keys
 */
const withoutPrivateKeys = (eid) => Object.fromEntries(Object.entries(eid).filter(([key]) => !key.startsWith('_')));

/**
 * Read targeting data cached by the Optable bundle on a previous page, in the
 * SDK's shape (EIDs under `user.eids`), with `_`-prefixed EID metadata stripped.
 * @returns {Object|null} Cached ORTB2 object with at least one EID, or null
 */
const readResolvedCache = () => {
  try {
    const ortb2 = JSON.parse(storage.getDataFromLocalStorage(OPTABLE_RESOLVED_KEY) || 'null')?.ortb2;
    if (!ortb2?.user?.eids?.length) {
      return null;
    }
    return { ...ortb2, user: { ...ortb2.user, eids: ortb2.user.eids.map(withoutPrivateKeys) } };
  } catch (error) {
    logWarn('Could not read cached targeting data', error);
    return null;
  }
};

/**
 * Read targeting data cached by the Optable bundle on a previous page, with the
 * EIDs under `user.ext.eids`.
 * @returns {Object|null} Cached ORTB2 object with at least one EID, or null
 */
export const readCachedTargeting = () => {
  const ortb2 = readResolvedCache();
  return ortb2 && toExtEids(ortb2);
};

/**
 * Run `withBundle` once the Optable bundle has loaded. Until it loads, hand the
 * targeting it cached on a previous page to `withCache` instead of waiting, so
 * auctions that start first still get Optable data; with nothing cached, wait
 * for the bundle, but no longer than `timeout`: the RTD framework releases the
 * auction after auctionDelay, so anything merged later would be wasted work.
 * @param {boolean} bundleLoaded Whether the bundle has already loaded
 * @param {function(): (Object|null)} readCache Reads the cache, null when there is nothing usable
 * @param {function((number|null)): *} withBundle Called once the bundle is available, with what is left of `timeout`
 * @param {function(Object): *} withCache Called with what `readCache` returned
 * @param {number|null} [timeout] Stop waiting for the bundle after this many ms (the RTD auctionDelay);
 *   0 does not wait, and unset waits until the bundle loads
 * @returns {Promise<*>} What the chosen callback returns
 */
const withBundleOrCache = async (bundleLoaded, readCache, withBundle, withCache, timeout = null) => {
  if (bundleLoaded) {
    return withBundle(timeout);
  }

  const cached = readCache();
  if (cached) {
    logMessage('Optable bundle not loaded yet, using cached targeting data');
    return withCache(cached);
  }

  const bounded = typeof timeout === 'number';
  if (bounded && timeout <= 0) {
    logMessage('Optable bundle not loaded yet and no cached data; the auction is not delayed, so not waiting');
    return;
  }

  logMessage('Optable bundle not loaded yet and no cached data, waiting for the bundle');
  const deadline = bounded ? Date.now() + timeout : null;
  window.optable = window.optable || { cmd: [] };
  const loaded = await new Promise((resolve) => {
    let timer;
    window.optable.cmd.push(() => {
      clearTimeout(timer);
      resolve(true);
    });
    if (bounded) {
      timer = setTimeout(() => resolve(false), timeout);
    }
  });
  if (!loaded) {
    logWarn(`Optable bundle did not load within ${timeout}ms`);
    return;
  }
  return withBundle(bounded ? Math.max(deadline - Date.now(), 0) : null);
};

/**
 * Enrich the request once the Optable bundle has loaded: use the bundle's own
 * handler if it exposes one, otherwise wait for its targeting data
 * @type {OptableHandleRtd}
 */
const handleRtdWithBundle = async (reqBidsConfigObj, optableExtraData, mergeFn, instance = null, timeout = null) => {
  const bundleHandleRtd = window.optable?.rtd?.handleRtd;
  if (typeof bundleHandleRtd === 'function') {
    logMessage('Using the Optable bundle handleRtd');
    return bundleHandleRtd(reqBidsConfigObj, optableExtraData, mergeFn);
  }

  // Wait for the Optable SDK to dispatch targeting data via event
  const targetingData = await waitForOptableEvent('optable-targeting:change', instance, timeout);

  if (!targetingData || !targetingData.ortb2) {
    logWarn('No targeting data found');
    return;
  }

  mergeFn(
    reqBidsConfigObj.ortb2Fragments.global,
    toExtEids(targetingData.ortb2),
  );
  logMessage('Prebid\'s global ORTB2 object after merge: ', reqBidsConfigObj.ortb2Fragments.global);
};

/**
 * Default function to handle/enrich RTD data. Called without waiting for the
 * Optable bundle, so auctions that start before it loads can still use data
 * cached on a previous page.
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {OptableRtdConfig} optableExtraData Additional data to be used by the Optable SDK
 * @param {OptableMergeFn} mergeFn Function to merge data
 * @param {string|null} [instance] Property name of the SDK instance on `window.optable`
 * @param {number|null} [timeout] Stop waiting for the SDK event after this many ms (the RTD auctionDelay)
 * @returns {Promise<void>}
 */
export const defaultHandleRtd = async (reqBidsConfigObj, optableExtraData, mergeFn, instance = null, timeout = null) => withBundleOrCache(
  isBundleLoaded(instance),
  readResolvedCache,
  (remaining) => handleRtdWithBundle(reqBidsConfigObj, optableExtraData, mergeFn, instance, remaining),
  (cachedOrtb2) => mergeFn(reqBidsConfigObj.ortb2Fragments.global, toExtEids(cachedOrtb2)),
  timeout,
);

/**
 * Get data from Optable and merge it into the global ORTB2 object.
 * Always waits for the handler: checking for a native AsyncFunction fails once
 * the build transpiles async functions (e.g. `gulp build --ES5`).
 * @param {OptableHandleRtd} handleRtdFn Function to handle RTD data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {OptableRtdConfig} optableExtraData Additional data to be used by the Optable SDK
 * @param {OptableMergeFn} mergeFn Function to merge data
 * @param {string|null} [instance] Property name of the SDK instance on `window.optable`
 */
export const mergeOptableData = async (handleRtdFn, reqBidsConfigObj, optableExtraData, mergeFn, instance = null) => {
  await handleRtdFn(reqBidsConfigObj, optableExtraData, mergeFn, instance);
};

let sessionID = null;
/** Targeting requests by `targetingRequestKey`; failed ones are dropped so the next auction retries */
let targetingRequests = new Map();

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
 * @param {string} cacheKey localStorage key of the targeting cache
 * @returns {Object|null} Cached targeting data or null
 */
const getCachedTargeting = (cacheKey) => {
  const cacheData = storage.getDataFromLocalStorage(cacheKey);
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
 * Read cached targeting data that is worth serving instead of waiting for the SDK:
 * EIDs or a split test assignment. The bundles write an empty cache by default.
 * @param {string} cacheKey localStorage key of the targeting cache
 * @returns {Object|null} Cached targeting data or null
 */
const readUsableCache = (cacheKey) => {
  const cached = getCachedTargeting(cacheKey);
  return (cached?.ortb2?.user?.eids?.length || cached?.split_test_assignment) ? cached : null;
};

/**
 * Set targeting data in localStorage
 * @param {string} cacheKey localStorage key of the targeting cache
 * @param {Object} targetingData Targeting response
 */
const setCachedTargeting = (cacheKey, targetingData) => {
  if (!isCacheable(targetingData)) {
    return;
  }
  storage.setDataInLocalStorage(cacheKey, JSON.stringify(targetingData));
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
 * EID source, ext.optable.ref pointers and `_`-prefixed metadata stripped from EIDs.
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
        eids: eids.map((eid) => ({ ...withoutPrivateKeys(eid), uids: (eid.uids || []).map(stripRefPointer) })),
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
 * @param {number|null} timeout Stop waiting for the SDK event after this many ms (the RTD auctionDelay)
 * @returns {Promise<void>}
 */
const handleSDKMode = async (handleRtdFn, reqBidsConfigObj, mergeFn, options, instance, timeout) => {
  const targetingData = await waitForOptableEvent('optable-targeting:change', instance, timeout);

  if (!targetingData) {
    logWarn('No targeting data from SDK event');
    return;
  }

  await handleRtdFn(reqBidsConfigObj, targetingData, mergeFn, options);
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
    }, null, { method: 'GET', withCredentials: params.consent.deviceAccess && params.cookies !== false, keepalive: true });
  });
};

/**
 * What a targeting request depends on. Leaves out the passport, which the first
 * response updates, and the session ID, which is fixed per page load.
 * @param {Object} apiParams Targeting API parameters
 * @returns {string} Key shared by requests that would get the same answer
 */
const targetingRequestKey = (apiParams) => {
  const { host, node, site, ids, hids, consent, cookies, cacheKey } = apiParams;
  return JSON.stringify([host, node, site, ids, hids, consent, cookies !== false, cacheKey]);
};

/**
 * Call the targeting API once per page load for each set of parameters (host, node,
 * site, identifiers, consent, cookie mode and cache key), and update both caches.
 * Concurrent auctions with the same parameters share the request; a failed call is
 * retried by the next auction.
 * @param {Object} apiParams Targeting API parameters
 * @returns {Promise<Object|null>} Targeting response or null
 */
const fetchTargeting = (apiParams) => {
  const key = targetingRequestKey(apiParams);
  if (!targetingRequests.has(key)) {
    const forget = () => {
      if (targetingRequests.get(key) === request) {
        targetingRequests.delete(key);
      }
    };
    const request = callTargetingAPI(apiParams).then(data => {
      if (data) {
        setCachedTargeting(apiParams.cacheKey, data);
        setSDKTargetingCache(apiParams.host, apiParams.node, data);
      } else {
        forget();
      }
      return data;
    }).catch(err => {
      logError('Targeting request failed', err);
      forget();
      return null;
    });
    targetingRequests.set(key, request);
  }
  return targetingRequests.get(key);
};

export function resetTargetingRequest() {
  targetingRequests = new Map();
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
      // Ad unit objects are reused across auctions, so drop an assignment the current response no longer has
      if (targetingData.split_test_assignment) {
        adUnit.ortb2Imp.ext.optable.splitTestAssignment = targetingData.split_test_assignment;
      } else {
        delete adUnit.ortb2Imp.ext.optable.splitTestAssignment;
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

    const { host, node, site, cookies, timeout: configTimeout, ids: configIds, hids: configHids, handleRtd, instance, hasDirectApiConfig, skipMergeIfUid2Exists, cacheKey } = parsedConfig;
    const handleRtdFn = handleRtd || targetingHandleRtd;
    const options = { skipMergeIfUid2Exists };

    const sdkAvailable = isSDKAvailable(instance);
    // Pages set up window.optable before loading the Optable bundle, which keeps its own merged cache under
    // OPTABLE_RESOLVED; let it answer rather than overwrite that cache with a direct call
    const bundleExpected = !sdkAvailable && !!window.optable;
    if (!sdkAvailable && !bundleExpected && !hasDirectApiConfig && (host || node || site)) {
      logError('host, node and site are all required for direct API calls, skipping Optable RTD');
      callback();
      return;
    }

    if (sdkAvailable || bundleExpected || !hasDirectApiConfig) {
      logMessage('SDK mode: using the Optable Web SDK targeting');
      await withBundleOrCache(
        sdkAvailable,
        () => readUsableCache(cacheKey),
        (remaining) => handleSDKMode(handleRtdFn, reqBidsConfigObj, mergeDeep, options, instance, remaining),
        (cachedData) => handleRtdFn(reqBidsConfigObj, cachedData, mergeDeep, options),
        timeout,
      );
      callback();
      return;
    }

    // Leave 100ms of the auction delay for the merge; the DCN expects a Go duration
    const effectiveTimeout = configTimeout ?? ((timeout && timeout > 100) ? `${timeout - 100}ms` : null);
    const sessionId = generateSessionID();
    const consent = extractConsent(userConsent);
    const { ids, hids } = extractIdentifiers(configIds, configHids);
    const passport = getPassport(host, node);
    const apiParams = { host, node, site, ids, hids, consent, sessionId, passport, cookies, timeout: effectiveTimeout, cacheKey };

    logMessage(`Direct API mode: host=${host}, node=${node}, site=${site}, cookies=${cookies}, timeout=${effectiveTimeout}`);

    // Serve the cache immediately and refresh it in the background, once per page load
    const cachedData = getCachedTargeting(cacheKey);
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
    const { bundleUrl, handleRtd, instance } = parseConfig(moduleConfig);
    const handleRtdFn = handleRtd ||
      ((req, extraData, mergeFn, inst) => defaultHandleRtd(req, extraData, mergeFn, inst, timeout));
    const optableExtraData = config.getConfig('optableRtdConfig') || {};

    if (bundleUrl) {
      // Load the Optable JS bundle in parallel; the handler does not wait for it
      logMessage('Custom bundle URL found in config: ', bundleUrl);
      loadExternalScript(bundleUrl, MODULE_TYPE_RTD, MODULE_NAME, () => {
        logMessage('Successfully loaded Optable JS bundle');
      }, document);
    }

    // Call the handler right away. The default handler copes with the bundle
    // not being loaded yet; a custom handler decides for itself whether to wait.
    mergeOptableData(handleRtdFn, reqBidsConfigObj, optableExtraData, mergeDeep, instance).then(callback, (error) => {
      logError('handleRtd failed, continuing the auction without Optable data', error);
      callback();
    });
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
