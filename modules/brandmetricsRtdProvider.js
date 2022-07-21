/**
 * This module adds brandmetrics provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will load load the brandmetrics script and set survey- targeting to ad units of specific bidders.
 * @module modules/brandmetricsRtdProvider
 * @requires module:modules/realTimeData
 */
import {submodule} from '../src/hook.js';
import {deepAccess, deepSetValue, logError, mergeDeep} from '../src/utils.js';
import {loadExternalScript} from '../src/adloader.js';

const MODULE_NAME = 'brandmetrics'
const MODULE_CODE = MODULE_NAME
const RECEIVED_EVENTS = []
const GVL_ID = 422
const TCF_PURPOSES = [1, 7]

function init (config, userConsent) {
  const hasConsent = checkConsent(userConsent)

  if (hasConsent) {
    const moduleConfig = getMergedConfig(config)
    initializeBrandmetrics(moduleConfig.params.scriptId)
  }
  return hasConsent
}

/**
 * Checks TCF and USP consents
 * @param {Object} userConsent
 * @returns {boolean}
 */
function checkConsent (userConsent) {
  let consent = false

  if (userConsent && userConsent.gdpr && userConsent.gdpr.gdprApplies) {
    const gdpr = userConsent.gdpr

    if (gdpr.vendorData) {
      const vendor = gdpr.vendorData.vendor
      const purpose = gdpr.vendorData.purpose

      let vendorConsent = false
      if (vendor.consents) {
        vendorConsent = vendor.consents[GVL_ID]
      }

      if (vendor.legitimateInterests) {
        vendorConsent = vendorConsent || vendor.legitimateInterests[GVL_ID]
      }

      const purposes = TCF_PURPOSES.map(id => {
        return (purpose.consents && purpose.consents[id]) || (purpose.legitimateInterests && purpose.legitimateInterests[id])
      })
      const purposesValid = purposes.filter(p => p === true).length === TCF_PURPOSES.length
      consent = vendorConsent && purposesValid
    }
  } else if (userConsent.usp) {
    const usp = userConsent.usp
    consent = usp[1] !== 'N' && usp[2] !== 'Y'
  }

  return consent
}

/**
* Add event- listeners to hook in to brandmetrics events
* @param {Object} reqBidsConfigObj
* @param {function} callback
*/
function processBrandmetricsEvents (reqBidsConfigObj, moduleConfig, callback) {
  const callBidTargeting = (event) => {
    if (event.available && event.conf) {
      const targetingConf = event.conf.displayOption || {}
      if (targetingConf.type === 'pbjs') {
        setBidderTargeting(reqBidsConfigObj, moduleConfig, targetingConf.targetKey || 'brandmetrics_survey', event.survey.measurementId)
      }
    }
    callback()
  }

  if (RECEIVED_EVENTS.length > 0) {
    callBidTargeting(RECEIVED_EVENTS[RECEIVED_EVENTS.length - 1])
  } else {
    window._brandmetrics = window._brandmetrics || []
    window._brandmetrics.push({
      cmd: '_addeventlistener',
      val: {
        event: 'surveyloaded',
        reEmitLast: true,
        handler: (ev) => {
          RECEIVED_EVENTS.push(ev)
          if (RECEIVED_EVENTS.length === 1) {
            // Call bid targeting only for the first received event, if called subsequently, last event from the RECEIVED_EVENTS array is used
            callBidTargeting(ev)
          }
        },
      }
    })
  }
}

/**
 * Sets bid targeting of specific bidders
 * @param {Object} reqBidsConfigObj
 * @param {string} key Targeting key
 * @param {string} val Targeting value
 */
function setBidderTargeting (reqBidsConfigObj, moduleConfig, key, val) {
  const bidders = deepAccess(moduleConfig, 'params.bidders')
  if (bidders && bidders.length > 0) {
    bidders.forEach(bidder => {
      deepSetValue(reqBidsConfigObj, `ortb2Fragments.bidder.${bidder}.user.ext.data.${key}`, val);
    })
  }
}

/**
 * Add the brandmetrics script to the page.
 * @param {string} scriptId - The script- id provided by brandmetrics or brandmetrics partner
 */
function initializeBrandmetrics(scriptId) {
  if (scriptId) {
    const path = 'https://cdn.brandmetrics.com/survey/script/'
    const file = scriptId + '.js'
    const url = path + file

    loadExternalScript(url, MODULE_CODE)
  }
}

/**
 * Merges a provided config with default values
 * @param {Object} customConfig
 * @returns
 */
function getMergedConfig(customConfig) {
  return mergeDeep({
    waitForIt: false,
    params: {
      bidders: [],
      scriptId: undefined,
    }
  }, customConfig)
}

/** @type {RtdSubmodule} */
export const brandmetricsSubmodule = {
  name: MODULE_NAME,
  getBidRequestData: function (reqBidsConfigObj, callback, customConfig) {
    try {
      const moduleConfig = getMergedConfig(customConfig)
      if (moduleConfig.waitForIt) {
        processBrandmetricsEvents(reqBidsConfigObj, moduleConfig, callback)
      } else {
        callback()
      }
    } catch (e) {
      logError(e)
    }
  },
  init: init
}

submodule('realTimeData', brandmetricsSubmodule)
