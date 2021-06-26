/**
 * This module adds the AirGrid provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time audience data from AirGrid
 * @module modules/airgridRtdProvider
 * @requires module:modules/realTimeData
 */

import {submodule} from '../src/hook.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {getStorageManager} from '../src/storageManager.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'airgrid';
const AG_TCF_ID = 782;
export const AG_AUDIENCE_IDS_KEY = 'edkt_matched_audience_ids'

export const storage = getStorageManager(AG_TCF_ID, SUBMODULE_NAME);

/**
 * Attach script tag to DOM
 * @param {Object} rtdConfig
 */
export function attachScriptTagToDOM(rtdConfig) {
  var edktInitializor = window.edktInitializor = window.edktInitializor || {};
  if (!edktInitializor.invoked) {
    edktInitializor.invoked = true;
    edktInitializor.accountId = rtdConfig.params.accountId;
    edktInitializor.publisherId = rtdConfig.params.publisherId;
    edktInitializor.apiKey = rtdConfig.params.apiKey;
    edktInitializor.load = function(e) {
      var p = e || 'sdk';
      var n = document.createElement('script');
      n.type = 'text/javascript';
      n.async = true;
      n.src = 'https://cdn.edkt.io/' + p + '/edgekit.min.js';
      var a = document.getElementsByTagName('head')[0];
      a.parentNode.insertBefore(n, a);
    };
    edktInitializor.load(edktInitializor.accountId);
  }
}

/**
 * Fetch audiences from localStorage
 * @return {Array}
 */
export function getMatchedAudiencesFromStorage() {
  const audiences = storage.getDataFromLocalStorage(AG_AUDIENCE_IDS_KEY);
  if (!audiences) return []
  try {
    return JSON.parse(audiences);
  } catch (e) {
    return [];
  }
}

/**
 * Mutates the adUnits object
 * @param {Object} adUnits
 * @param {Array} audiences
 */
function appendAudiencesToAdUnits(adUnits, audiences) {
  adUnits.forEach((adUnit) => {
    adUnit.bids.forEach((bid) => {
      if (bid.bidder && bid.bidder === 'appnexus') {
        if (!bid.params) bid.params = {};
        if (!bid.params.keywords) bid.params.keywords = {};
        bid.params.keywords.perid = audiences;
      }
    })
  })
}

/**
 * Module init
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 * @return {boolean}
 */
function init(rtdConfig, userConsent) {
  attachScriptTagToDOM(rtdConfig);
  return true;
}

/**
 * Real-time data retrieval from AirGrid
 * @param {Object} reqBidsConfigObj
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
export function getRealTimeData(bidConfig, onDone, rtdConfig, userConsent) {
  const adUnits = bidConfig.adUnits || getGlobal().adUnits;
  const audiences = getMatchedAudiencesFromStorage();
  if (adUnits && audiences.length > 0) {
    appendAudiencesToAdUnits(adUnits, audiences);
  }
  onDone();
};

/** @type {RtdSubmodule} */
export const airgridSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: getRealTimeData
};

submodule(MODULE_NAME, airgridSubmodule);
