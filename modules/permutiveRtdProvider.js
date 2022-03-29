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
  const segmentData = getSegments(moduleConfig.params.maxSegs, segmentIdTransformationsByBidder)

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
  const segmentData = getSegments(maxSegs, segmentIdTransformationsByBidder)

  acBidders.forEach(function (bidder) {
    const currConfig = bidderConfig[bidder] || {}
    const extData = getBidderExtensionData(bidder) || {}
    const nextConfig = mergeOrtbConfig(currConfig, segmentData, extData)

    config.setBidderConfig({
      bidders: [bidder],
      config: nextConfig
    })
  })
}

/**
 * Merges segments and extension data into existing bidder config
 * @param {Object} currConfig - Current bidder config
 * @param {Object} segmentData - Segment data
 * @param {Object} extData - Exchange-specific extension data
 * @return {Object} Merged ortb2 object
 */
function mergeOrtbConfig (currConfig, segmentData, extData) {
  const segment = segmentData.ac.map(seg => {
    return { id: seg }
  })
  const name = 'permutive.com'
  const ortbConfig = mergeDeep({}, currConfig)
  const currSegments = deepAccess(ortbConfig, 'ortb2.user.data') || []
  const userSegment = currSegments
    .filter(el => el.name !== name)
    .concat({ name, segment, ext: extData })

  deepSetValue(ortbConfig, 'ortb2.user.data', userSegment)

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
 * @param {Object} bidderTransformations - object containing functions to transform segment IDs, keyed by bidder ID
 * @return {Object}
 */
export function getSegments (maxSegs, bidderTransformations) {
  const legacySegs = readSegments('_psegs').map(Number).filter(seg => seg >= 1000000).map(String)
  const _ppam = readSegments('_ppam')
  const _pcrprs = readSegments('_pcrprs')

  const segments = {
    ac: [..._pcrprs, ..._ppam, ...legacySegs],
    rubicon: readSegments('_prubicons'),
    appnexus: readSegments('_papns'),
    gam: readSegments('_pdfps'),
    ix: legacySegs
  }

  for (const bidder in segments) {
    segments[bidder] = segments[bidder].slice(0, maxSegs)

    if (bidderTransformations.hasOwnProperty(bidder)) {
      segments[bidder] = bidderTransformations[bidder](segments[bidder])
    }
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

/**
 * Retrieves bidder-specific extension data for use in the ORTB2 object
 * @param {string} bidder - bidder ID
 * @returns {Object} data to set as user.data.ext object for the provided bidder ID
 */
function getBidderExtensionData(bidder) {
  const extensionsByBidder = {
    ix: {
      segtax: '4'
    }
  }

  return extensionsByBidder[bidder] || {}
}

/**
 * Bidder-specific functions to apply to an array of segment IDs,
 * returning a new array of transformed segment IDs.
 */
const segmentIdTransformationsByBidder = {
  ix: segments => segments.map(iabSegmentId).filter(id => id != 'unknown')
}

/**
 * Transform a Permutive segment ID into an IAB audience taxonomy ID.
 * Currently uses a hardcoded mapping to support an initial test of this functionality.
 * @param {string} permutiveSegmentId
 * @return {string} IAB audience taxonomy ID associated with the Permutive segment ID
 */
function iabSegmentId(permutiveSegmentId) {
  const iabIdsByPermutiveId = {
    1: '1' // TODO
  }

  return iabIdsByPermutiveId[permutiveSegmentId] || 'unknown'
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
