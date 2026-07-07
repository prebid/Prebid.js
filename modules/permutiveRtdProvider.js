/**
 * This module adds permutive provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will add custom segment targeting to ad units of specific bidders
 *
 * Cohorts are delivered to bidders through two mechanisms that run together:
 *
 * 1. SDK-driven cohort routing (recommended): the Permutive SDK maintains a
 *    normalised cohort store in the `_pcohorts` localStorage key, holding the
 *    user's cohorts once per category (`categories`) and per-bidder reference
 *    lists (`activations.ortb2.<bidder>`). Bidders are pointed at their
 *    reference list with `params.bidders.<bidder>.customCohorts` plus a
 *    `path`. Each referenced cohort is resolved to its category, and the
 *    category's placement policy (`params.placement`, over the built-in
 *    defaults) decides which ORTB2 locations (`params.locations`, over the
 *    built-in defaults) it is written to. Routing therefore changes with the
 *    store and config, without modifying this module.
 *
 * 2. Legacy configuration: cohorts are read from fixed localStorage keys and
 *    routed by hard-coded logic:
 *      - `_psegs` (IDs >= 1000000) and `_pcrprs` form the AC signals sent to
 *        `params.acBidders`
 *      - `_pssps` ({ ssps, cohorts }) routes SSP signals to the listed bidders
 *      - `_papns`, `_prubicons`, `_pindexs`, `_pdfps` hold custom cohorts for
 *        appnexus, rubicon, ix and gam respectively
 *      - `_ppsts` holds Privacy Sandbox Topics keyed by IAB taxonomy version
 *
 * Signals from both mechanisms are merged and deduplicated per bidder and
 * ORTB2 location before being applied, with `params.maxSegs` enforced per
 * location after the merge.
 *
 * @module modules/permutiveRtdProvider
 * @requires module:modules/realTimeData
 */
import { getGlobal } from '../src/prebidGlobal.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, deepSetValue, isFn, isStr, logError, mergeDeep, isPlainObject, safeJSONParse, prefixLog } from '../src/utils.js';
import { VENDORLESS_GVLID } from '../src/consentHandler.js';
import { hasPurposeConsent } from '../libraries/permutiveUtils/index.js';

import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('./permutiveRtdProvider.d.ts').PermutiveRtdProviderConfig} PermutiveRtdProviderConfig
 * @typedef {import('./permutiveRtdProvider.d.ts').PermutiveRtdProviderParams} PermutiveRtdProviderParams
 * @typedef {import('./permutiveRtdProvider.d.ts').PermutiveBidderConfig} PermutiveBidderConfig
 * @typedef {import('./permutiveRtdProvider.d.ts').PermutiveTransformationConfig} PermutiveTransformationConfig
 * @typedef {import('./permutiveRtdProvider.d.ts').PermutiveSignalRule} PermutiveSignalRule
 * @typedef {import('./permutiveRtdProvider.d.ts').PermutiveSignalLocation} PermutiveSignalLocation
 */

const MODULE_NAME = 'permutive';

const logger = prefixLog('[PermutiveRTD]');

export const PERMUTIVE_SUBMODULE_CONFIG_KEY = 'permutive-prebid-rtd';
export const PERMUTIVE_COHORTS_KEY = '_pcohorts';
export const PERMUTIVE_STANDARD_KEYWORD = 'p_standard';
export const PERMUTIVE_CUSTOM_COHORTS_KEYWORD = 'permutive';
export const PERMUTIVE_STANDARD_AUD_KEYWORD = 'p_standard_aud';

const PERMUTIVE_DATA_PROVIDER_NAME = 'permutive.com';

const USER_DATA_PATH = 'user.data';
const USER_KEYWORDS_PATH = 'user.keywords';
const USER_EXT_DATA_PATH = 'user.ext.data';
const SITE_EXT_PERMUTIVE_PATH = 'site.ext.permutive';

/**
 * Bidders that historically receive custom cohorts from their dedicated
 * localStorage keys without any publisher configuration. Kept for backwards
 * compatibility with existing activations.
 */
const LEGACY_CUSTOM_COHORT_BIDDERS = ['appnexus', 'rubicon', 'ix', 'gam'];

/**
 * Built-in ORTB2 location definitions, overridable via `params.locations`.
 * Each destination is declared once and referenced by id from placement
 * policies.
 */
const DEFAULT_LOCATIONS = {
  pcom: { path: USER_DATA_PATH, name: PERMUTIVE_DATA_PROVIDER_NAME },
  pstd_kw: { path: USER_KEYWORDS_PATH, key: PERMUTIVE_STANDARD_KEYWORD },
  psaud_kw: { path: USER_KEYWORDS_PATH, key: PERMUTIVE_STANDARD_AUD_KEYWORD },
  pstd_ext: { path: USER_EXT_DATA_PATH, key: PERMUTIVE_STANDARD_KEYWORD },
  pstd_site: { path: SITE_EXT_PERMUTIVE_PATH, key: PERMUTIVE_STANDARD_KEYWORD },
  perm: { path: USER_DATA_PATH, name: PERMUTIVE_CUSTOM_COHORTS_KEYWORD },
  perm_kw: { path: USER_KEYWORDS_PATH, key: PERMUTIVE_CUSTOM_COHORTS_KEYWORD },
  perm_ext: { path: USER_EXT_DATA_PATH, key: PERMUTIVE_CUSTOM_COHORTS_KEYWORD },
};

/**
 * Built-in placement policy mapping cohort categories to location ids,
 * overridable via `params.placement` (or per bidder via
 * `params.bidders.<bidder>.placement`). Mirrors the legacy hard-coded
 * routing: standard/DCR cohorts follow the AC signal locations, curated
 * cohorts additionally set the `p_standard_aud` keyword, and custom/CLM
 * cohorts follow the custom cohort locations.
 */
const DEFAULT_PLACEMENT = {
  standard: ['pcom', 'pstd_kw', 'pstd_ext', 'pstd_site'],
  dcr: ['pcom', 'pstd_kw', 'pstd_ext', 'pstd_site'],
  curated: ['pcom', 'pstd_kw', 'psaud_kw', 'pstd_ext', 'pstd_site'],
  clm: ['perm', 'perm_kw', 'perm_ext'],
  custom: ['perm', 'perm_kw', 'perm_ext'],
};

export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME });

function init(moduleConfig, userConsent) {
  readPermutiveModuleConfigFromCache();

  const enforceVendorConsent = deepAccess(moduleConfig, 'params.enforceVendorConsent');

  return hasPurposeConsent(userConsent, [1], enforceVendorConsent);
}

function liftIntoParams(params) {
  return isPlainObject(params) ? { params } : {};
}

let cachedPermutiveModuleConfig = {};

/**
 * Access the submodules RTD params that are cached to LocalStorage by the Permutive SDK. This lets the RTD submodule
 * apply publisher defined params set in the Permutive platform, so they may still be applied if the Permutive SDK has
 * not initialised before this submodule is initialised.
 */
function readPermutiveModuleConfigFromCache() {
  const params = safeJSONParse(storage.getDataFromLocalStorage(PERMUTIVE_SUBMODULE_CONFIG_KEY));
  cachedPermutiveModuleConfig = liftIntoParams(params);
  return cachedPermutiveModuleConfig;
}

/**
 * Access the submodules RTD params attached to the Permutive SDK.
 *
 * @return The Permutive config available by the Permutive SDK or null if the operation errors.
 */
function getParamsFromPermutive() {
  try {
    return liftIntoParams(window.permutive.addons.prebid.getPermutiveRtdConfig());
  } catch (e) {
    return null;
  }
}

/**
 * Merges segments into existing bidder config in reverse priority order. The highest priority is 1.
 *
 *   1. customModuleConfig <- set by publisher with pbjs.setConfig
 *   2. permutiveRtdConfig <- set by the publisher using the Permutive platform
 *   3. defaultConfig
 *
 * As items with a higher priority will be deeply merged into the previous config, deep merges are performed by
 * reversing the priority order.
 *
 * @param {PermutiveRtdProviderConfig} customModuleConfig - Publisher config for module
 * @return {PermutiveRtdProviderConfig} Deep merges of the default, Permutive and custom config.
 */
export function getModuleConfig(customModuleConfig) {
  // Use the params from Permutive if available, otherwise fallback to the cached value set by Permutive.
  const permutiveModuleConfig = getParamsFromPermutive() || cachedPermutiveModuleConfig;

  return mergeDeep({
    waitForIt: false,
    params: {
      maxSegs: 500,
      acBidders: [],
      overwrites: {},
      enforceVendorConsent: false,
      bidders: {},
    },
  },
  permutiveModuleConfig,
  customModuleConfig,
  );
}

/**
 * Builds signal rules from the SDK-maintained cohort store for every bidder
 * whose `customCohorts` config carries a `path`.
 *
 * The store (conventionally the `_pcohorts` localStorage key) holds each
 * cohort once under `categories`, and per-bidder reference lists (e.g. under
 * `activations.ortb2.<bidder>`). Each referenced cohort is resolved to its
 * category, and the category's placement policy decides which locations it is
 * written to.
 *
 * @param {PermutiveRtdProviderConfig} moduleConfig - Publisher config for module
 * @return {PermutiveSignalRule[]} Signal rules derived from the cohort store
 */
function buildCohortStoreSignalRules(moduleConfig) {
  const biddersConfig = deepAccess(moduleConfig, 'params.bidders') || {};
  const locations = { ...DEFAULT_LOCATIONS, ...(deepAccess(moduleConfig, 'params.locations') || {}) };
  const placement = { ...DEFAULT_PLACEMENT, ...(deepAccess(moduleConfig, 'params.placement') || {}) };

  const storeCache = {};
  const readStore = (key) => {
    if (!(key in storeCache)) {
      const store = readSegments(key, null);
      storeCache[key] = isPlainObject(store) ? store : null;
    }
    return storeCache[key];
  };

  const rules = [];

  Object.entries(biddersConfig).forEach(([bidder, bidderConfig]) => {
    const customCohorts = bidderConfig?.customCohorts;
    // Without a path the whole key is read as a flat cohort list via the
    // legacy route instead
    if (customCohorts?.source !== 'ls' || !customCohorts?.key || !customCohorts?.path) {
      return;
    }

    const store = readStore(customCohorts.key);
    if (!store) {
      return;
    }

    const refs = deepAccess(store, customCohorts.path);
    if (!Array.isArray(refs)) {
      return;
    }

    const cohortsByCategory = groupRefsByCategory(refs, store.categories, bidder);

    Object.entries(cohortsByCategory).forEach(([category, cohorts]) => {
      const locationIds = bidderConfig.placement?.[category] || placement[category];
      if (!Array.isArray(locationIds)) {
        logger.logWarn(`No placement configured for cohort category "${category}"`, { bidder });
        return;
      }

      const resolvedLocations = locationIds
        .map(id => {
          const location = locations[id];
          if (!location) {
            logger.logWarn(`Unknown location id "${id}" in placement for category "${category}"`, { bidder });
            return null;
          }
          return isValidLocation(location, id) ? location : null;
        })
        .filter(Boolean);

      if (resolvedLocations.length > 0) {
        rules.push({ bidders: [bidder], cohorts, locations: resolvedLocations });
      }
    });
  });

  return rules;
}

/**
 * Groups cohort references by their category, using the store's `categories`
 * index. Dangling references (not present in any category) are dropped with a
 * warning so under-delivery is never silent.
 *
 * @param {Array<string|number>} refs - Cohort references for one bidder
 * @param {Object} categories - The store's category -> cohort IDs index
 * @param {string} bidder - For log context
 * @return {Object} category -> cohort IDs
 */
function groupRefsByCategory(refs, categories, bidder) {
  const categoryByCohort = new Map();
  if (isPlainObject(categories)) {
    Object.entries(categories).forEach(([category, cohorts]) => {
      if (Array.isArray(cohorts)) {
        cohorts.forEach(cohort => categoryByCohort.set(String(cohort), category));
      }
    });
  }

  const cohortsByCategory = {};
  const dangling = [];

  refs.forEach(ref => {
    const cohort = String(ref);
    const category = categoryByCohort.get(cohort);
    if (!category) {
      dangling.push(cohort);
      return;
    }
    (cohortsByCategory[category] = cohortsByCategory[category] || []).push(cohort);
  });

  if (dangling.length > 0) {
    logger.logWarn('Dropping cohort references not present in any category', { bidder, dangling });
  }

  return cohortsByCategory;
}

/**
 * Validates an ORTB2 location definition. Only the allowlisted paths can be
 * written to.
 *
 * @param {PermutiveSignalLocation} location
 * @param {string} locationId - For log context
 * @return {boolean}
 */
function isValidLocation(location, locationId) {
  if (!isPlainObject(location)) {
    logger.logWarn(`Ignoring location "${locationId}": not an object`, location);
    return false;
  }

  if (location.ext !== undefined && !isPlainObject(location.ext)) {
    logger.logWarn(`Ignoring location "${locationId}": ext must be an object`, location);
    return false;
  }

  if (location.path === USER_DATA_PATH) {
    if (!isStr(location.name) || location.name === '') {
      logger.logWarn(`Ignoring location "${locationId}": "${USER_DATA_PATH}" requires a name`, location);
      return false;
    }
    return true;
  }

  if ([USER_KEYWORDS_PATH, USER_EXT_DATA_PATH, SITE_EXT_PERMUTIVE_PATH].includes(location.path)) {
    // Dots are rejected as the key contributes to a deepSetValue path
    if (!isStr(location.key) || location.key === '' || location.key.includes('.')) {
      logger.logWarn(`Ignoring location "${locationId}": "${location.path}" requires a key without dots`, location);
      return false;
    }
    return true;
  }

  logger.logWarn(`Ignoring location "${locationId}": unknown path`, location);
  return false;
}

/**
 * Expresses the legacy (hard-coded) cohort routing as signal rules, so both
 * mechanisms share a single merge and apply path.
 *
 * @param {PermutiveRtdProviderConfig} moduleConfig - Publisher config for module
 * @param {Object} segmentData - Segment data from getSegments()
 * @return {PermutiveSignalRule[]} Signal rules equivalent to the legacy routing
 */
function buildLegacySignalRules(moduleConfig, segmentData) {
  const acBidders = deepAccess(moduleConfig, 'params.acBidders') || [];
  const biddersConfig = deepAccess(moduleConfig, 'params.bidders') || {};

  const acSignals = segmentData?.ac ?? [];
  const sspBidders = segmentData?.ssp?.ssps ?? [];
  const sspSignals = segmentData?.ssp?.cohorts ?? [];
  const topics = segmentData?.topics ?? {};

  const standardLocations = [
    { path: USER_DATA_PATH, name: PERMUTIVE_DATA_PROVIDER_NAME },
    { path: USER_KEYWORDS_PATH, key: PERMUTIVE_STANDARD_KEYWORD },
    { path: USER_EXT_DATA_PATH, key: PERMUTIVE_STANDARD_KEYWORD },
    { path: SITE_EXT_PERMUTIVE_PATH, key: PERMUTIVE_STANDARD_KEYWORD },
  ];

  const customCohortLocations = [
    { path: USER_DATA_PATH, name: PERMUTIVE_CUSTOM_COHORTS_KEYWORD },
    { path: USER_KEYWORDS_PATH, key: PERMUTIVE_CUSTOM_COHORTS_KEYWORD },
    { path: USER_EXT_DATA_PATH, key: PERMUTIVE_CUSTOM_COHORTS_KEYWORD },
  ];

  const rules = [];

  if (acBidders.length > 0) {
    rules.push({ bidders: acBidders, cohorts: acSignals, locations: standardLocations });
  }

  if (sspBidders.length > 0) {
    rules.push({
      bidders: sspBidders,
      cohorts: sspSignals,
      locations: [...standardLocations, { path: USER_KEYWORDS_PATH, key: PERMUTIVE_STANDARD_AUD_KEYWORD }],
    });
  }

  const allBidders = new Set([
    ...acBidders,
    ...sspBidders,
    ...Object.keys(biddersConfig),
    ...LEGACY_CUSTOM_COHORT_BIDDERS,
  ]);

  allBidders.forEach(bidder => {
    rules.push({
      bidders: [bidder],
      cohorts: getCustomCohorts(biddersConfig[bidder], bidder, segmentData),
      locations: customCohortLocations,
    });

    for (const [taxonomy, topicIds] of Object.entries(topics)) {
      if (topicIds.length > 0) {
        rules.push({
          bidders: [bidder],
          cohorts: topicIds,
          locations: [{ path: USER_DATA_PATH, name: PERMUTIVE_DATA_PROVIDER_NAME, ext: { segtax: Number(taxonomy) } }],
        });
      }
    }
  });

  return rules;
}

/**
 * Resolves custom cohorts for a bidder, reading from localStorage if configured.
 * @param {PermutiveBidderConfig} bidderConfig - Bidder-specific configuration from params.bidders
 * @param {string} bidder - The bidder identifier
 * @param {Object} segmentData - Segment data grouped by bidder or type
 * @return {string[]} Custom cohort IDs
 */
function getCustomCohorts(bidderConfig, bidder, segmentData) {
  const customCohorts = bidderConfig?.customCohorts;
  if (customCohorts?.source === 'ls' && customCohorts?.key) {
    // With a path the cohorts are resolved through the cohort store flow
    // (buildCohortStoreSignalRules) instead of a whole-key read
    if (customCohorts.path) {
      return [];
    }
    return makeSafe(() => readSegments(customCohorts.key, []).map(String)) || [];
  }
  if (LEGACY_CUSTOM_COHORT_BIDDERS.includes(bidder)) {
    return deepAccess(segmentData, bidder) || [];
  }
  return [];
}

/**
 * A stable identity for an ORTB2 location, so cohorts destined for the same
 * location merge into one entry. `ext` participates in the identity: two
 * user.data locations with the same name but different segtax stay separate.
 *
 * @param {PermutiveSignalLocation} location
 * @return {string} Identity usable as a Map key. Never parsed back.
 */
function locationId(location) {
  const ext = location.ext ? Object.fromEntries(Object.entries(location.ext).sort(([a], [b]) => a.localeCompare(b))) : null;
  return JSON.stringify([location.path, location.name ?? null, location.key ?? null, ext]);
}

/**
 * Merges signal rules into per-bidder, per-location cohort sets.
 *
 * @param {PermutiveSignalRule[]} rules
 * @return {Map<string, Map<string, {location: PermutiveSignalLocation, cohorts: Set<string>}>>}
 */
function collectBidderSignals(rules) {
  const bidderSignals = new Map();

  rules.forEach(rule => {
    rule.bidders.forEach(bidder => {
      if (!bidderSignals.has(bidder)) {
        bidderSignals.set(bidder, new Map());
      }
      const locations = bidderSignals.get(bidder);

      rule.locations.forEach(location => {
        const id = locationId(location);
        if (!locations.has(id)) {
          locations.set(id, { location, cohorts: new Set() });
        }
        const { cohorts } = locations.get(id);
        rule.cohorts.forEach(cohort => cohorts.add(String(cohort)));
      });
    });
  });

  return bidderSignals;
}

/**
 * Sets ortb2 config for bidders with Permutive signals.
 *
 * Merges rules resolved from the SDK-maintained cohort store (`_pcohorts`)
 * with rules derived from the legacy configuration, then applies the merged
 * cohorts to each bidder's ORTB2 fragment. `maxSegs` is enforced per location
 * after the merge.
 *
 * @param {Object} bidderOrtb2 - The ortb2 object for the all bidders
 * @param {PermutiveRtdProviderConfig} moduleConfig - Publisher config for module
 * @param {Object} segmentData - Segment data grouped by bidder or type
 */
export function setBidderRtb(bidderOrtb2, moduleConfig, segmentData) {
  if (!bidderOrtb2) {
    return;
  }

  const maxSegs = deepAccess(moduleConfig, 'params.maxSegs');
  const transformationConfigs = deepAccess(moduleConfig, 'params.transformations') || [];

  const rules = [
    ...buildCohortStoreSignalRules(moduleConfig),
    ...buildLegacySignalRules(moduleConfig, segmentData),
  ];

  const bidderSignals = collectBidderSignals(rules);

  bidderSignals.forEach((locations, bidder) => {
    const ortbConfig = { ortb2: mergeDeep({}, bidderOrtb2[bidder] || {}) };

    locations.forEach(({ location, cohorts }) => {
      const limitedCohorts = Array.from(cohorts).slice(0, maxSegs);
      applyCohortsToOrtb2(ortbConfig, location, limitedCohorts, transformationConfigs);
    });

    logger.logInfo(`Updated ortb2 config`, { bidder, config: ortbConfig });
    bidderOrtb2[bidder] = ortbConfig.ortb2;
  });
}

/**
 * Applies cohorts to a single ORTB2 location.
 *
 * @param {Object} ortbConfig - Object with an `ortb2` property, mutated in place
 * @param {PermutiveSignalLocation} location
 * @param {string[]} cohorts
 * @param {PermutiveTransformationConfig[]} transformationConfigs
 */
function applyCohortsToOrtb2(ortbConfig, location, cohorts, transformationConfigs) {
  switch (location.path) {
    case USER_DATA_PATH:
      applyToUserData(ortbConfig, location, cohorts, transformationConfigs);
      break;
    case USER_KEYWORDS_PATH:
      applyToUserKeywords(ortbConfig, location.key, cohorts);
      break;
    case USER_EXT_DATA_PATH:
      if (cohorts.length > 0) {
        deepSetValue(ortbConfig, `ortb2.user.ext.data.${location.key}`, cohorts);
      }
      break;
    case SITE_EXT_PERMUTIVE_PATH:
      if (cohorts.length > 0) {
        deepSetValue(ortbConfig, `ortb2.site.ext.permutive.${location.key}`, cohorts);
      }
      break;
  }
}

/**
 * Whether two user.data entries occupy the same slot, i.e. share both name and
 * ext. Entries this module writes replace existing entries in the same slot
 * only, so a plain entry never clobbers a segtax entry of the same name (and
 * vice versa) regardless of the order locations are applied in.
 */
function isSameUserDataSlot(a, b) {
  return a.name === b.name && JSON.stringify(a.ext ?? null) === JSON.stringify(b.ext ?? null);
}

/**
 * Applies cohorts to a user.data entry identified by name and (optional) ext.
 *
 * @param {Object} ortbConfig - Object with an `ortb2` property, mutated in place
 * @param {PermutiveSignalLocation} location
 * @param {string[]} cohorts
 * @param {PermutiveTransformationConfig[]} transformationConfigs
 */
function applyToUserData(ortbConfig, location, cohorts, transformationConfigs) {
  const { name, ext } = location;

  // The custom cohorts entry has always been present even when empty, and is
  // kept that way in case consumers rely on its presence.
  if (cohorts.length === 0 && name !== PERMUTIVE_CUSTOM_COHORTS_KEYWORD) {
    return;
  }

  const userData = {
    name,
    segment: cohorts.map(id => ({ id })),
    ...(ext && { ext }),
  };

  // Publisher-configured IAB taxonomy transformations only ever apply to the
  // standard cohorts entry
  const transformedUserData = (name === PERMUTIVE_DATA_PROVIDER_NAME && !ext && cohorts.length > 0)
    ? transformationConfigs
      .filter(({ id }) => ortb2UserDataTransformations.hasOwnProperty(id))
      .map(({ id, config }) => ortb2UserDataTransformations[id](userData, config))
    : [];

  const newEntries = [userData, ...transformedUserData];

  const currentUserData = deepAccess(ortbConfig, 'ortb2.user.data') || [];
  const updatedUserData = currentUserData
    .filter(existing => !newEntries.some(entry => isSameUserDataSlot(existing, entry)))
    .concat(newEntries);

  deepSetValue(ortbConfig, 'ortb2.user.data', updatedUserData);
}

/**
 * Merges cohorts into the user.keywords string as `key=cohort` pairs,
 * preserving and deduplicating against existing keywords.
 *
 * @param {Object} ortbConfig - Object with an `ortb2` property, mutated in place
 * @param {string} keywordKey - Keyword prefix (e.g. p_standard)
 * @param {string[]} cohorts
 */
function applyToUserKeywords(ortbConfig, keywordKey, cohorts) {
  if (cohorts.length === 0) {
    return;
  }

  const currentKeywords = deepAccess(ortbConfig, 'ortb2.user.keywords');

  const keywords = Array.from(new Set([
    ...(currentKeywords || '').split(',').map(kv => kv.trim()),
    ...cohorts.map(id => `${keywordKey}=${id}`),
  ]))
    .filter(Boolean)
    .join(',');

  deepSetValue(ortbConfig, 'ortb2.user.keywords', keywords);
}

/**
 * Set segments on bid request object
 * @param {Object} reqBidsConfigObj - Bid request object
 * @param {PermutiveRtdProviderConfig} moduleConfig - Module configuration
 * @param {Object} segmentData - Segment object
 */
function setSegments (reqBidsConfigObj, moduleConfig, segmentData) {
  const adUnits = (reqBidsConfigObj && reqBidsConfigObj.adUnits) || getGlobal().adUnits;
  const utils = { deepSetValue, deepAccess, isFn, mergeDeep };
  const aliasMap = {
    appnexusAst: 'appnexus'
  };

  if (!adUnits) {
    return;
  }

  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      let { bidder } = bid;
      if (typeof aliasMap[bidder] !== 'undefined') {
        bidder = aliasMap[bidder];
      }
      const acEnabled = isAcEnabled(moduleConfig, bidder);
      const customFn = getCustomBidderFn(moduleConfig, bidder);

      if (customFn) {
        // For backwards compatibility we pass an identity function to any custom bidder function set by a publisher
        const bidIdentity = (bid) => bid;
        customFn(bid, segmentData, acEnabled, utils, bidIdentity);
      }
    });
  });
}

/**
 * Catch and log errors
 * @param {function} fn - Function to safely evaluate
 */
function makeSafe (fn) {
  try {
    return fn();
  } catch (e) {
    logError(e);
  }
}

function getCustomBidderFn (moduleConfig, bidder) {
  const overwriteFn = deepAccess(moduleConfig, `params.overwrites.${bidder}`);

  if (overwriteFn && isFn(overwriteFn)) {
    return overwriteFn;
  } else {
    return null;
  }
}

/**
 * Check whether ac is enabled for bidder
 * @param {PermutiveRtdProviderConfig} moduleConfig - Module configuration
 * @param {string} bidder - Bidder name
 * @return {boolean}
 */
export function isAcEnabled (moduleConfig, bidder) {
  const acBidders = deepAccess(moduleConfig, 'params.acBidders') || [];
  return acBidders.includes(bidder);
}

/**
 * Check whether Permutive is on page
 * @return {boolean}
 */
export function isPermutiveOnPage () {
  return typeof window.permutive !== 'undefined' && typeof window.permutive.ready === 'function';
}

/**
 * Get all relevant segment IDs in an object
 * @param {number} maxSegs - Maximum number of segments to be included
 * @return {Object}
 */
export function getSegments(maxSegs) {
  const segments = {
    ac:
      makeSafe(() => {
        const legacySegs =
          makeSafe(() =>
            readSegments('_psegs', [])
              .map(Number)
              .filter((seg) => seg >= 1000000)
              .map(String),
          ) || [];
        const _pcrprs = makeSafe(() => readSegments('_pcrprs', []).map(String)) || [];

        return [..._pcrprs, ...legacySegs];
      }) || [],

    ix:
      makeSafe(() => {
        const _pindexs = readSegments('_pindexs', []);
        return _pindexs.map(String);
      }) || [],

    rubicon:
      makeSafe(() => {
        const _prubicons = readSegments('_prubicons', []);
        return _prubicons.map(String);
      }) || [],

    appnexus:
      makeSafe(() => {
        const _papns = readSegments('_papns', []);
        return _papns.map(String);
      }) || [],

    gam:
      makeSafe(() => {
        const _pdfps = readSegments('_pdfps', []);
        return _pdfps.map(String);
      }) || [],

    ssp: makeSafe(() => {
      const _pssps = readSegments('_pssps', {
        cohorts: [],
        ssps: [],
      });

      return {
        cohorts: makeSafe(() => _pssps.cohorts.map(String)) || [],
        ssps: makeSafe(() => _pssps.ssps.map(String)) || [],
      };
    }),

    topics:
      makeSafe(() => {
        const _ppsts = readSegments('_ppsts', {});

        const topics = {};
        for (const [k, value] of Object.entries(_ppsts)) {
          topics[k] = makeSafe(() => value.map(String)) || [];
        }

        return topics;
      }) || {},
  };

  for (const bidder in segments) {
    if (bidder === 'ssp') {
      if (segments[bidder].cohorts && Array.isArray(segments[bidder].cohorts)) {
        segments[bidder].cohorts = segments[bidder].cohorts.slice(0, maxSegs);
      }
    } else if (bidder === 'topics') {
      for (const taxonomy in segments[bidder]) {
        segments[bidder][taxonomy] = segments[bidder][taxonomy].slice(0, maxSegs);
      }
    } else {
      segments[bidder] = segments[bidder].slice(0, maxSegs);
    }
  }

  logger.logInfo(`Read segments`, segments);
  return segments;
}

/**
 * Gets an array of segment IDs from LocalStorage
 * or return the default value provided.
 * @template A
 * @param {string} key
 * @param {A} defaultValue
 * @return {A}
 */
function readSegments (key, defaultValue) {
  try {
    return JSON.parse(storage.getDataFromLocalStorage(key)) || defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

const unknownIabSegmentId = '_unknown_';

/**
 * Functions to apply to ORT2B2 `user.data` objects.
 * Each function should return an a new object containing a `name`, (optional) `ext` and `segment`
 * properties. The result of the each transformation defined here will be appended to the array
 * under `user.data` in the bid request.
 */
const ortb2UserDataTransformations = {
  iab: (userData, config) => ({
    name: userData.name,
    ext: { segtax: config.segtax },
    segment: (userData.segment || [])
      .map(segment => ({ id: iabSegmentId(segment.id, config.iabIds) }))
      .filter(segment => segment.id !== unknownIabSegmentId)
  })
};

/**
 * Transform a Permutive segment ID into an IAB audience taxonomy ID.
 * @param {string} permutiveSegmentId
 * @param {Object} iabIds object of mappings between Permutive and IAB segment IDs (key: permutive ID, value: IAB ID)
 * @return {string} IAB audience taxonomy ID associated with the Permutive segment ID
 */
function iabSegmentId(permutiveSegmentId, iabIds) {
  return iabIds[permutiveSegmentId] || unknownIabSegmentId;
}

/**
 * Pull the latest configuration and cohort information and update accordingly.
 *
 * @param reqBidsConfigObj - Bidder provided config for request
 * @param moduleConfig - Publisher provided config
 */
export function readAndSetCohorts(reqBidsConfigObj, moduleConfig) {
  const segmentData = getSegments(deepAccess(moduleConfig, 'params.maxSegs'));

  makeSafe(function () {
    // Legacy route with custom parameters
    // ACK policy violation, in process of removing
    setSegments(reqBidsConfigObj, moduleConfig, segmentData);
  });

  makeSafe(function () {
    // Route for bidders supporting ORTB2
    setBidderRtb(reqBidsConfigObj.ortb2Fragments?.bidder, moduleConfig, segmentData);
  });
}

let permutiveSDKInRealTime = false;

/** @type {RtdSubmodule} */
export const permutiveSubmodule = {
  name: MODULE_NAME,
  disclosureURL: "https://assets.permutive.app/tcf/tcf.json",
  gvlid: VENDORLESS_GVLID,
  getBidRequestData: function (reqBidsConfigObj, callback, customModuleConfig) {
    const completeBidRequestData = () => {
      logger.logInfo(`Request data updated`);
      callback();
    };

    const moduleConfig = getModuleConfig(customModuleConfig);

    readAndSetCohorts(reqBidsConfigObj, moduleConfig);

    makeSafe(function () {
      if (permutiveSDKInRealTime || !(moduleConfig.waitForIt && isPermutiveOnPage())) {
        return completeBidRequestData();
      }

      window.permutive.ready(function () {
        logger.logInfo(`SDK is realtime, updating cohorts`);
        permutiveSDKInRealTime = true;
        readAndSetCohorts(reqBidsConfigObj, getModuleConfig(customModuleConfig));
        completeBidRequestData();
      }, 'realtime');

      logger.logInfo(`Registered cohort update when SDK is realtime`);
    });
  },
  init: init
};

submodule('realTimeData', permutiveSubmodule);
