/**
 * This module adds the AirGrid provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time audience data from AirGrid
 * @module modules/airgridRtdProvider
 * @requires module:modules/realTimeData
 */
import {submodule} from '../src/hook.js';
import {deepAccess, deepSetValue, mergeDeep} from '../src/utils.js';
import {getStorageManager} from '../src/storageManager.js';
import {loadExternalScript} from '../src/adloader.js';
import {MODULE_TYPE_RTD} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'airgrid';
const AG_TCF_ID = 782;
export const AG_AUDIENCE_IDS_KEY = 'edkt_matched_audience_ids';

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: SUBMODULE_NAME,
});

function getModuleUrl(accountId) {
  const path = accountId ?? 'sdk';
  return `https://cdn.edkt.io/${path}/edgekit.min.js`;
}

/**
 * Attach script tag to DOM
 * @param {Object} rtdConfig
 * @return {void}
 */
export function attachScriptTagToDOM(rtdConfig) {
  var edktInitializor = (window.edktInitializor = window.edktInitializor || {});
  if (!edktInitializor.invoked) {
    edktInitializor.accountId = rtdConfig.params.accountId;
    edktInitializor.publisherId = rtdConfig.params.publisherId;
    edktInitializor.apiKey = rtdConfig.params.apiKey;
    edktInitializor.invoked = true;
    const moduleSrc = getModuleUrl(rtdConfig.params.accountId);
    loadExternalScript(moduleSrc, SUBMODULE_NAME);
  }
}

/**
 * Fetch audiences from localStorage
 * @return {Array}
 */
export function getMatchedAudiencesFromStorage() {
  const audiences = storage.getDataFromLocalStorage(AG_AUDIENCE_IDS_KEY);
  if (!audiences) return [];
  try {
    return JSON.parse(audiences);
  } catch (e) {
    return [];
  }
}

/**
 * Pass audience data to configured bidders, using ORTB2
 * @param {Object} bidConfig
 * @param {Object} rtdConfig
 * @param {Array} audiences
 * @return {void}
 */
export function setAudiencesAsBidderOrtb2(bidConfig, rtdConfig, audiences) {
  const bidders = deepAccess(rtdConfig, 'params.bidders');
  if (!bidders || bidders.length === 0 || !audiences || audiences.length === 0) return;

  const agOrtb2 = {};

  const agUserData = [
    {
      id: String(AG_TCF_ID),
      ext: {
        segtax: 540,
      },
      name: 'airgrid',
      segment: audiences.map((id) => ({id}))
    }
  ]
  deepSetValue(agOrtb2, 'user.data', agUserData);

  const bidderConfig = Object.fromEntries(
    bidders.map((bidder) => [bidder, agOrtb2])
  )
  mergeDeep(bidConfig?.ortb2Fragments?.bidder, bidderConfig)
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
 * @param {Object} bidConfig
 * @param {function} onDone
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 * @return {void}
 */
export function passAudiencesToBidders(
  bidConfig,
  onDone,
  rtdConfig,
  userConsent
) {
  const audiences = getMatchedAudiencesFromStorage();
  if (audiences.length > 0) {
    setAudiencesAsBidderOrtb2(bidConfig, rtdConfig, audiences)
  }
  onDone();
}

/** @type {RtdSubmodule} */
export const airgridSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: passAudiencesToBidders,
  gvlid: AG_TCF_ID
};

submodule(MODULE_NAME, airgridSubmodule);
