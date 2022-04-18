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
import {deepAccess, deepSetValue, isFn, logError, mergeDeep} from '../src/utils.js';
import {config} from '../src/config.js';
import {includes} from '../src/polyfill.js';

const MODULE_NAME = 'permutive'

export const storage = getStorageManager({gvlid: null, moduleName: MODULE_NAME})

function init (moduleConfig, userConsent) {
  return true
}

/**
 * Set segment targeting from cache and then try to wait for Permutive
 * to initialise to get realtime segment targeting
 * @param {Object} reqBidsConfigObj
 * @param {function} callback - Called when submodule is done
 * @param {customModuleConfig} reqBidsConfigObj - Publisher config for module
 */
export function initSegments (reqBidsConfigObj, callback, customModuleConfig) {
  const permutiveOnPage = isPermutiveOnPage()
  const moduleConfig = getModuleConfig(customModuleConfig)
  const segmentData = getSegments(moduleConfig.params.maxSegs)

  setSegments(reqBidsConfigObj, moduleConfig, segmentData)

  if (moduleConfig.waitForIt && permutiveOnPage) {
    window.permutive.ready(function () {
      setSegments(reqBidsConfigObj, moduleConfig, segmentData)
      callback()
    }, 'realtime')
  } else {
    callback()
  }
}

/**
 * Merges segments into existing bidder config
 * @param {Object} customModuleConfig - Publisher config for module
 * @return {Object} Merged defatul and custom config
 */
function getModuleConfig (customModuleConfig) {
  return mergeDeep({
    waitForIt: false,
    params: {
      maxSegs: 500,
      acBidders: [],
      overwrites: {}
    }
  }, customModuleConfig)
}

/**
 * Sets ortb2 config for ac bidders
 * @param {Object} auctionDetails
 * @param {Object} customModuleConfig - Publisher config for module
 */
export function setBidderRtb (auctionDetails, customModuleConfig) {
  const bidderConfig = config.getBidderConfig()
  const moduleConfig = getModuleConfig(customModuleConfig)
  const acBidders = deepAccess(moduleConfig, 'params.acBidders')
  const maxSegs = deepAccess(moduleConfig, 'params.maxSegs')
  const transformationConfigs = deepAccess(moduleConfig, 'params.transformations') || []
  const segmentData = getSegments(maxSegs)

  acBidders.forEach(function (bidder) {
    const currConfig = bidderConfig[bidder] || {}
    const nextConfig = updateOrtbConfig(currConfig, segmentData.ac, transformationConfigs) // ORTB2 uses the `ac` segment IDs

    config.setBidderConfig({
      bidders: [bidder],
      config: nextConfig
    })
  })
}

/**
 * Updates `user.data` object in existing bidder config with Permutive segments
 * @param {Object} currConfig - Current bidder config
 * @param {Object[]} transformationConfigs - array of objects with `id` and `config` properties, used to determine
 *                                           the transformations on user data to include the ORTB2 object
 * @param {string[]} segmentIDs - Permutive segment IDs
 * @return {Object} Merged ortb2 object
 */
function updateOrtbConfig (currConfig, segmentIDs, transformationConfigs) {
  const name = 'permutive.com'

  const permutiveUserData = {
    name,
    segment: segmentIDs.map(segmentId => ({ id: segmentId })),
  }

  const transformedUserData = transformationConfigs
    .filter(({ id }) => ortb2UserDataTransformations.hasOwnProperty(id))
    .map(({ id, config }) => ortb2UserDataTransformations[id](permutiveUserData, config))

  const ortbConfig = mergeDeep({}, currConfig)
  const currentUserData = deepAccess(ortbConfig, 'ortb2.user.data') || []

  const updatedUserData = currentUserData
    .filter(el => el.name !== name)
    .concat(permutiveUserData, transformedUserData)

  deepSetValue(ortbConfig, 'ortb2.user.data', updatedUserData)

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
      const defaultFn = getDefaultBidderFn(bidder)

      if (customFn) {
        customFn(bid, segmentData, acEnabled, utils, defaultFn)
      } else if (defaultFn) {
        defaultFn(bid, segmentData, acEnabled)
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
 * Returns a function that receives a `bid` object, a `data` object and a `acEnabled` boolean
 * and which will set the right segment targeting keys for `bid` based on `data` and `acEnabled`
 * @param {string} bidder - Bidder name
 * @return {Object} Bidder function
 */
function getDefaultBidderFn (bidder) {
  const bidderMap = {
    appnexus: function (bid, data, acEnabled) {
      if (acEnabled && data.ac && data.ac.length) {
        deepSetValue(bid, 'params.keywords.p_standard', data.ac)
      }
      if (data.appnexus && data.appnexus.length) {
        deepSetValue(bid, 'params.keywords.permutive', data.appnexus)
      }

      return bid
    },
    rubicon: function (bid, data, acEnabled) {
      if (acEnabled && data.ac && data.ac.length) {
        deepSetValue(bid, 'params.visitor.p_standard', data.ac)
      }
      if (data.rubicon && data.rubicon.length) {
        deepSetValue(bid, 'params.visitor.permutive', data.rubicon)
      }

      return bid
    },
    ozone: function (bid, data, acEnabled) {
      if (acEnabled && data.ac && data.ac.length) {
        deepSetValue(bid, 'params.customData.0.targeting.p_standard', data.ac)
      }

      return bid
    }
  }

  return bidderMap[bidder]
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
  const legacySegs = readSegments('_psegs').map(Number).filter(seg => seg >= 1000000).map(String)
  const _ppam = readSegments('_ppam')
  const _pcrprs = readSegments('_pcrprs')

  const segments = {
    ac: [..._pcrprs, ..._ppam, ...legacySegs],
    rubicon: readSegments('_prubicons'),
    appnexus: readSegments('_papns'),
    gam: readSegments('_pdfps'),
  }

  for (const bidder in segments) {
    segments[bidder] = segments[bidder].slice(0, maxSegs)
  }

  return segments
}

/**
 * Gets an array of segment IDs from LocalStorage
 * or returns an empty array
 * @param {string} key
 * @return {string[]|number[]}
 */
function readSegments (key) {
  try {
    return JSON.parse(storage.getDataFromLocalStorage(key) || '[]')
  } catch (e) {
    return []
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

/** @type {RtdSubmodule} */
export const permutiveSubmodule = {
  name: MODULE_NAME,
  getBidRequestData: function (reqBidsConfigObj, callback, customModuleConfig) {
    makeSafe(function () {
      // Legacy route with custom parameters
      initSegments(reqBidsConfigObj, callback, customModuleConfig)
    })
  },
  onAuctionInitEvent: function (auctionDetails, customModuleConfig) {
    makeSafe(function () {
      // Route for bidders supporting ORTB2
      setBidderRtb(auctionDetails, customModuleConfig)
    })
  },
  init: init
}

submodule('realTimeData', permutiveSubmodule)
