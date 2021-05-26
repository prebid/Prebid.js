/**
 * This module adds permutive provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will add custom segment targeting to ad units of specific bidders
 * @module modules/permutiveRtdProvider
 * @requires module:modules/realTimeData
 */
import { getGlobal } from '../src/prebidGlobal.js'
import { submodule } from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js'
import { deepSetValue, deepAccess, isFn, mergeDeep, logError } from '../src/utils.js'
import includes from 'core-js-pure/features/array/includes.js'
const MODULE_NAME = 'permutive'

export const storage = getStorageManager(null, MODULE_NAME)

function init (config, userConsent) {
  return true
}

/**
* Set segment targeting from cache and then try to wait for Permutive
* to initialise to get realtime segment targeting
*/
export function initSegments (reqBidsConfigObj, callback, customConfig) {
  const permutiveOnPage = isPermutiveOnPage()
  const config = mergeDeep({
    waitForIt: false,
    params: {
      maxSegs: 500,
      acBidders: [],
      overwrites: {}
    }
  }, customConfig)

  setSegments(reqBidsConfigObj, config)

  if (config.waitForIt && permutiveOnPage) {
    window.permutive.ready(function () {
      setSegments(reqBidsConfigObj, config)
      callback()
    }, 'realtime')
  } else {
    callback()
  }
}

function setSegments (reqBidsConfigObj, config) {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits
  const data = getSegments(config.params.maxSegs)
  const utils = { deepSetValue, deepAccess, isFn, mergeDeep }

  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      const { bidder } = bid
      const acEnabled = isAcEnabled(config, bidder)
      const customFn = getCustomBidderFn(config, bidder)
      const defaultFn = getDefaultBidderFn(bidder)

      if (customFn) {
        customFn(bid, data, acEnabled, utils, defaultFn)
      } else if (defaultFn) {
        defaultFn(bid, data, acEnabled)
      }
    })
  })
}

function makeSafe (fn) {
  try {
    fn()
  } catch (e) {
    logError(e)
  }
}

function getCustomBidderFn (config, bidder) {
  const overwriteFn = deepAccess(config, `params.overwrites.${bidder}`)

  if (overwriteFn && isFn(overwriteFn)) {
    return overwriteFn
  } else {
    return null
  }
}

/**
* Returns a function that receives a `bid` object, a `data` object and a `acEnabled` boolean
* and which will set the right segment targeting keys for `bid` based on `data` and `acEnabled`
* @param {string} bidder
* @param {object} data
*/
function getDefaultBidderFn (bidder) {
  const bidderMapper = {
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
    },
    trustx: function (bid, data, acEnabled) {
      if (acEnabled && data.ac && data.ac.length) {
        deepSetValue(bid, 'params.keywords.p_standard', data.ac)
      }

      return bid
    }
  }

  return bidderMapper[bidder]
}

export function isAcEnabled (config, bidder) {
  const acBidders = deepAccess(config, 'params.acBidders') || []
  return includes(acBidders, bidder)
}

export function isPermutiveOnPage () {
  return typeof window.permutive !== 'undefined' && typeof window.permutive.ready === 'function'
}

/**
* Returns all relevant segment IDs in an object
*/
export function getSegments (maxSegs) {
  const legacySegs = readSegments('_psegs').map(Number).filter(seg => seg >= 1000000).map(String)
  const _ppam = readSegments('_ppam')
  const _pcrprs = readSegments('_pcrprs')

  const segments = {
    ac: [..._pcrprs, ..._ppam, ...legacySegs],
    rubicon: readSegments('_prubicons'),
    appnexus: readSegments('_papns'),
    gam: readSegments('_pdfps')
  }

  for (const type in segments) {
    segments[type] = segments[type].slice(0, maxSegs)
  }

  return segments
}

/**
 * Gets an array of segment IDs from LocalStorage
 * or returns an empty array
 * @param {string} key
 */
function readSegments (key) {
  try {
    return JSON.parse(storage.getDataFromLocalStorage(key) || '[]')
  } catch (e) {
    return []
  }
}

/** @type {RtdSubmodule} */
export const permutiveSubmodule = {
  name: MODULE_NAME,
  getBidRequestData: function (reqBidsConfigObj, callback, customConfig) {
    makeSafe(function () {
      initSegments(reqBidsConfigObj, callback, customConfig)
    })
  },
  init: init
}

submodule('realTimeData', permutiveSubmodule)
