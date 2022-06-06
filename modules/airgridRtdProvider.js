/**
 * This module adds the AirGrid provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time audience data from AirGrid
 * @module modules/airgridRtdProvider
 * @requires module:modules/realTimeData
 */
import { config } from '../src/config.js';
import { submodule } from '../src/hook.js';
import {
  mergeDeep,
  isPlainObject,
  deepSetValue,
  deepAccess,
} from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'airgrid';
const AG_TCF_ID = 782;
export const AG_AUDIENCE_IDS_KEY = 'edkt_matched_audience_ids';

export const storage = getStorageManager({
  gvlid: AG_TCF_ID,
  moduleName: SUBMODULE_NAME,
});

/**
 * Attach script tag to DOM
 * @param {Object} rtdConfig
 * @return {void}
 */
export function attachScriptTagToDOM(rtdConfig) {
  var edktInitializor = (window.edktInitializor = window.edktInitializor || {});
  if (!edktInitializor.invoked) {
    edktInitializor.invoked = true;
    edktInitializor.accountId = rtdConfig.params.accountId;
    edktInitializor.publisherId = rtdConfig.params.publisherId;
    edktInitializor.apiKey = rtdConfig.params.apiKey;
    edktInitializor.load = function (e) {
      var p = e || 'sdk';
      var n = document.createElement('script');
      n.type = 'module';
      n.async = true;
      n.src = 'https://cdn.edkt.io/' + p + '/edgekit.min.js';
      document.getElementsByTagName('head')[0].appendChild(n);
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
  if (!audiences) return [];
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
 * @return {void}
 */
function setAudiencesToAppNexusAdUnits(adUnits, audiences) {
  adUnits.forEach((adUnit) => {
    adUnit.bids.forEach((bid) => {
      if (bid.bidder && bid.bidder === 'appnexus') {
        deepSetValue(bid, 'params.keywords.perid', audiences || []);
      }
    });
  });
}

/**
 * Pass audience data to configured bidders, using ORTB2
 * @param {Object} rtdConfig
 * @param {Array} audiences
 * @return {void}
 */
export function setAudiencesUsingBidderOrtb2(rtdConfig, audiences) {
  const bidders = deepAccess(rtdConfig, 'params.bidders');
  if (!bidders || bidders.length === 0) return;
  const allBiddersConfig = config.getBidderConfig();
  const agOrtb2 = {};
  deepSetValue(agOrtb2, 'ortb2.user.ext.data.airgrid', audiences || []);

  bidders.forEach((bidder) => {
    let bidderConfig = {};
    if (isPlainObject(allBiddersConfig[bidder])) {
      bidderConfig = allBiddersConfig[bidder];
    }
    config.setBidderConfig({
      bidders: [bidder],
      config: mergeDeep(bidderConfig, agOrtb2),
    });
  });
}

export function setAudiencesUsingAppNexusAuctionKeywords(audiences) {
  config.setConfig({
    appnexusAuctionKeywords: {
      perid: audiences,
    },
  });
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
 * @return {void}
 */
export function passAudiencesToBidders(
  bidConfig,
  onDone,
  rtdConfig,
  userConsent
) {
  const adUnits = bidConfig.adUnits || getGlobal().adUnits;
  const audiences = getMatchedAudiencesFromStorage();
  if (audiences.length > 0) {
    setAudiencesUsingAppNexusAuctionKeywords(audiences);
    setAudiencesUsingBidderOrtb2(rtdConfig, audiences);
    if (adUnits) {
      setAudiencesToAppNexusAdUnits(adUnits, audiences);
    }
  }
  onDone();
}

/** @type {RtdSubmodule} */
export const airgridSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: passAudiencesToBidders,
};

submodule(MODULE_NAME, airgridSubmodule);
