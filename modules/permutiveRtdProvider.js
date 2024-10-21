/**
 * This module adds permutive provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will add custom segment targeting to ad units of specific bidders
 * @module modules/permutiveRtdProvider
 * @requires module:modules/realTimeData
 */
import {getGlobal} from '../src/prebidGlobal.js';
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {deepAccess, deepSetValue, isFn, logError, mergeDeep, isPlainObject, safeJSONParse, prefixLog} from '../src/utils.js';
import {includes} from '../src/polyfill.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'permutive'

const logger = prefixLog('[PermutiveRTD]')

export const PERMUTIVE_SUBMODULE_CONFIG_KEY = 'permutive-prebid-rtd'
export const PERMUTIVE_STANDARD_KEYWORD = 'p_standard'
export const PERMUTIVE_CUSTOM_COHORTS_KEYWORD = 'permutive'
export const PERMUTIVE_STANDARD_AUD_KEYWORD = 'p_standard_aud'

export const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME})

function init(moduleConfig, userConsent) {
  readPermutiveModuleConfigFromCache()

  return true
}

function liftIntoParams(params) {
  return isPlainObject(params) ? { params } : {}
}

let cachedPermutiveModuleConfig = {}

/**
 * Access the submodules RTD params that are cached to LocalStorage by the Permutive SDK. This lets the RTD submodule
 * apply publisher defined params set in the Permutive platform, so they may still be applied if the Permutive SDK has
 * not initialised before this submodule is initialised.
 */
function readPermutiveModuleConfigFromCache() {
  const params = safeJSONParse(storage.getDataFromLocalStorage(PERMUTIVE_SUBMODULE_CONFIG_KEY))
  return cachedPermutiveModuleConfig = liftIntoParams(params)
}

/**
 * Access the submodules RTD params attached to the Permutive SDK.
 *
 * @return The Permutive config available by the Permutive SDK or null if the operation errors.
 */
function getParamsFromPermutive() {
  try {
    return liftIntoParams(window.permutive.addons.prebid.getPermutiveRtdConfig())
  } catch (e) {
    return null
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
 * @param {Object} customModuleConfig - Publisher config for module
 * @return {Object} Deep merges of the default, Permutive and custom config.
 */
export function getModuleConfig(customModuleConfig) {
  // Use the params from Permutive if available, otherwise fallback to the cached value set by Permutive.
  const permutiveModuleConfig = getParamsFromPermutive() || cachedPermutiveModuleConfig

  return mergeDeep({
    waitForIt: false,
    params: {
      maxSegs: 500,
      acBidders: [],
      overwrites: {},
    },
  },
  permutiveModuleConfig,
  customModuleConfig,
  )
}

/**
 * Sets ortb2 config for ac bidders
 * @param {Object} bidderOrtb2 - The ortb2 object for the all bidders
 * @param {Object} customModuleConfig - Publisher config for module
 */
export function setBidderRtb (bidderOrtb2, moduleConfig, segmentData) {
  const acBidders = deepAccess(moduleConfig, 'params.acBidders')
  const maxSegs = deepAccess(moduleConfig, 'params.maxSegs')
  const transformationConfigs = deepAccess(moduleConfig, 'params.transformations') || []

  const ssps = segmentData?.ssp?.ssps ?? []
  const sspCohorts = segmentData?.ssp?.cohorts ?? []
  const topics = segmentData?.topics ?? {}

  const bidders = new Set([...acBidders, ...ssps])
  bidders.forEach(function (bidder) {
    const currConfig = { ortb2: bidderOrtb2[bidder] || {} }

    let cohorts = []

    const isAcBidder = acBidders.indexOf(bidder) > -1
    if (isAcBidder) {
      cohorts = segmentData.ac
    }

    const isSspBidder = ssps.indexOf(bidder) > -1
    if (isSspBidder) {
      cohorts = [...new Set([...cohorts, ...sspCohorts])].slice(0, maxSegs)
    }

    const nextConfig = updateOrtbConfig(bidder, currConfig, cohorts, sspCohorts, topics, transformationConfigs, segmentData)
    bidderOrtb2[bidder] = nextConfig.ortb2
  })
}

/**
 * Updates `user.data` object in existing bidder config with Permutive segments
 * @param string bidder - The bidder
 * @param {Object} currConfig - Current bidder config
 * @param {Object[]} transformationConfigs - array of objects with `id` and `config` properties, used to determine
 *                                           the transformations on user data to include the ORTB2 object
 * @param {string[]} segmentIDs - Permutive segment IDs
 * @param {string[]} sspSegmentIDs - Permutive SSP segment IDs
 * @param {Object} topics - Privacy Sandbox Topics, keyed by IAB taxonomy version (600, 601, etc.)
 * @param {Object} segmentData - The segments available for targeting
 * @return {Object} Merged ortb2 object
 */
function updateOrtbConfig(bidder, currConfig, segmentIDs, sspSegmentIDs, topics, transformationConfigs, segmentData) {
  logger.logInfo(`Current ortb2 config`, { bidder, config: currConfig })

  const customCohortsData = deepAccess(segmentData, bidder) || []

  const name = 'permutive.com'

  const permutiveUserData = {
    name,
    segment: segmentIDs.map(segmentId => ({ id: segmentId })),
  }

  const transformedUserData = transformationConfigs
    .filter(({ id }) => ortb2UserDataTransformations.hasOwnProperty(id))
    .map(({ id, config }) => ortb2UserDataTransformations[id](permutiveUserData, config))

  const customCohortsUserData = {
    name: PERMUTIVE_CUSTOM_COHORTS_KEYWORD,
    segment: customCohortsData.map(cohortID => ({ id: cohortID })),
  }

  const ortbConfig = mergeDeep({}, currConfig)
  const currentUserData = deepAccess(ortbConfig, 'ortb2.user.data') || []

  let topicsUserData = []
  for (const [k, value] of Object.entries(topics)) {
    topicsUserData.push({
      name,
      ext: {
        segtax: Number(k)
      },
      segment: value.map(topic => ({ id: topic.toString() })),
    })
  }

  const updatedUserData = currentUserData
    .filter(el => el.name !== permutiveUserData.name && el.name !== customCohortsUserData.name)
    .concat(permutiveUserData, transformedUserData, customCohortsUserData)
    .concat(topicsUserData)

  logger.logInfo(`Updating ortb2.user.data`, { bidder, user_data: updatedUserData })
  deepSetValue(ortbConfig, 'ortb2.user.data', updatedUserData)

  // Set ortb2.user.keywords
  const currentKeywords = deepAccess(ortbConfig, 'ortb2.user.keywords')
  const keywordGroups = {
    [PERMUTIVE_STANDARD_KEYWORD]: segmentIDs,
    [PERMUTIVE_STANDARD_AUD_KEYWORD]: sspSegmentIDs,
    [PERMUTIVE_CUSTOM_COHORTS_KEYWORD]: customCohortsData,
  }

  // Transform groups of key-values into a single array of strings
  // i.e { permutive: ['1', '2'], p_standard: ['3', '4'] } => ['permutive=1', 'permutive=2', 'p_standard=3',' p_standard=4']
  const transformedKeywordGroups = Object.entries(keywordGroups)
    .flatMap(([keyword, ids]) => ids.map(id => `${keyword}=${id}`))

  const keywords = [
    currentKeywords,
    ...transformedKeywordGroups,
  ]
    .filter(Boolean)
    .join(',')

  logger.logInfo(`Updating ortb2.user.keywords`, {
    bidder,
    keywords,
  })
  deepSetValue(ortbConfig, 'ortb2.user.keywords', keywords)

  // Set user extensions
  if (segmentIDs.length > 0) {
    deepSetValue(ortbConfig, `ortb2.user.ext.data.${PERMUTIVE_STANDARD_KEYWORD}`, segmentIDs)
    logger.logInfo(`Extending ortb2.user.ext.data with "${PERMUTIVE_STANDARD_KEYWORD}"`, segmentIDs)
  }

  if (customCohortsData.length > 0) {
    deepSetValue(ortbConfig, `ortb2.user.ext.data.${PERMUTIVE_CUSTOM_COHORTS_KEYWORD}`, customCohortsData.map(String))
    logger.logInfo(`Extending ortb2.user.ext.data with "${PERMUTIVE_CUSTOM_COHORTS_KEYWORD}"`, customCohortsData)
  }

  // Set site extensions
  if (segmentIDs.length > 0) {
    deepSetValue(ortbConfig, `ortb2.site.ext.permutive.${PERMUTIVE_STANDARD_KEYWORD}`, segmentIDs)
    logger.logInfo(`Extending ortb2.site.ext.permutive with "${PERMUTIVE_STANDARD_KEYWORD}"`, segmentIDs)
  }

  logger.logInfo(`Updated ortb2 config`, { bidder, config: ortbConfig })
  return ortbConfig
}

/**
 * Set segments on bid request object
 * @param {Object} reqBidsConfigObj - Bid request object
 * @param {Object} moduleConfig - Module configuration
 * @param {Object} segmentData - Segment object
 */
function setSegments (reqBidsConfigObj, moduleConfig, segmentData) {
  const adUnits = (reqBidsConfigObj && reqBidsConfigObj.adUnits) || getGlobal().adUnits
  const utils = { deepSetValue, deepAccess, isFn, mergeDeep }
  const aliasMap = {
    appnexusAst: 'appnexus'
  }

  if (!adUnits) {
    return
  }

  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      let { bidder } = bid
      if (typeof aliasMap[bidder] !== 'undefined') {
        bidder = aliasMap[bidder]
      }
      const acEnabled = isAcEnabled(moduleConfig, bidder)
      const customFn = getCustomBidderFn(moduleConfig, bidder)

      if (customFn) {
        // For backwards compatibility we pass an identity function to any custom bidder function set by a publisher
        const bidIdentity = (bid) => bid
        customFn(bid, segmentData, acEnabled, utils, bidIdentity)
      }
    })
  })
}

/**
 * Catch and log errors
 * @param {function} fn - Function to safely evaluate
 */
function makeSafe (fn) {
  try {
    fn()
  } catch (e) {
    logError(e)
  }
}

function getCustomBidderFn (moduleConfig, bidder) {
  const overwriteFn = deepAccess(moduleConfig, `params.overwrites.${bidder}`)

  if (overwriteFn && isFn(overwriteFn)) {
    return overwriteFn
  } else {
    return null
  }
}

/**
 * Check whether ac is enabled for bidder
 * @param {Object} moduleConfig - Module configuration
 * @param {string} bidder - Bidder name
 * @return {boolean}
 */
export function isAcEnabled (moduleConfig, bidder) {
  const acBidders = deepAccess(moduleConfig, 'params.acBidders') || []
  return includes(acBidders, bidder)
}

/**
 * Check whether Permutive is on page
 * @return {boolean}
 */
export function isPermutiveOnPage () {
  return typeof window.permutive !== 'undefined' && typeof window.permutive.ready === 'function'
}

/**
 * Get all relevant segment IDs in an object
 * @param {number} maxSegs - Maximum number of segments to be included
 * @return {Object}
 */
export function getSegments (maxSegs) {
  const legacySegs = readSegments('_psegs', []).map(Number).filter(seg => seg >= 1000000).map(String)
  const _ppam = readSegments('_ppam', [])
  const _pcrprs = readSegments('_pcrprs', [])

  const segments = {
    ac: [..._pcrprs, ..._ppam, ...legacySegs],
    ix: readSegments('_pindexs', []),
    rubicon: readSegments('_prubicons', []),
    appnexus: readSegments('_papns', []),
    gam: readSegments('_pdfps', []),
    ssp: readSegments('_pssps', {
      cohorts: [],
      ssps: []
    }),
    topics: readSegments('_ppsts', {}),
  }

  for (const bidder in segments) {
    if (bidder === 'ssp') {
      if (segments[bidder].cohorts && Array.isArray(segments[bidder].cohorts)) {
        segments[bidder].cohorts = segments[bidder].cohorts.slice(0, maxSegs)
      }
    } else if (bidder === 'topics') {
      for (const taxonomy in segments[bidder]) {
        segments[bidder][taxonomy] = segments[bidder][taxonomy].slice(0, maxSegs)
      }
    } else {
      segments[bidder] = segments[bidder].slice(0, maxSegs)
    }
  }

  return segments
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
    return JSON.parse(storage.getDataFromLocalStorage(key)) || defaultValue
  } catch (e) {
    return defaultValue
  }
}

const unknownIabSegmentId = '_unknown_'

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
}

/**
 * Transform a Permutive segment ID into an IAB audience taxonomy ID.
 * @param {string} permutiveSegmentId
 * @param {Object} iabIds object of mappings between Permutive and IAB segment IDs (key: permutive ID, value: IAB ID)
 * @return {string} IAB audience taxonomy ID associated with the Permutive segment ID
 */
function iabSegmentId(permutiveSegmentId, iabIds) {
  return iabIds[permutiveSegmentId] || unknownIabSegmentId
}

/**
 * Pull the latest configuration and cohort information and update accordingly.
 *
 * @param reqBidsConfigObj - Bidder provided config for request
 * @param customModuleConfig - Publisher provide config
 */
export function readAndSetCohorts(reqBidsConfigObj, moduleConfig) {
  const segmentData = getSegments(deepAccess(moduleConfig, 'params.maxSegs'))

  makeSafe(function () {
    // Legacy route with custom parameters
    // ACK policy violation, in process of removing
    setSegments(reqBidsConfigObj, moduleConfig, segmentData)
  });

  makeSafe(function () {
    // Route for bidders supporting ORTB2
    setBidderRtb(reqBidsConfigObj.ortb2Fragments?.bidder, moduleConfig, segmentData)
  })
}

let permutiveSDKInRealTime = false

/** @type {RtdSubmodule} */
export const permutiveSubmodule = {
  name: MODULE_NAME,
  getBidRequestData: function (reqBidsConfigObj, callback, customModuleConfig) {
    const completeBidRequestData = () => {
      logger.logInfo(`Request data updated`)
      callback()
    }

    const moduleConfig = getModuleConfig(customModuleConfig)

    readAndSetCohorts(reqBidsConfigObj, moduleConfig)

    makeSafe(function () {
      if (permutiveSDKInRealTime || !(moduleConfig.waitForIt && isPermutiveOnPage())) {
        return completeBidRequestData()
      }

      window.permutive.ready(function () {
        logger.logInfo(`SDK is realtime, updating cohorts`)
        permutiveSDKInRealTime = true
        readAndSetCohorts(reqBidsConfigObj, getModuleConfig(customModuleConfig))
        completeBidRequestData()
      }, 'realtime')

      logger.logInfo(`Registered cohort update when SDK is realtime`)
    })
  },
  init: init
}

submodule('realTimeData', permutiveSubmodule)
