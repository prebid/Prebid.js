
import { submodule } from '../src/hook.js';
import { mergeDeep, isPlainObject, logMessage, deepSetValue } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import {config} from '../src/config.js';

const SUBMODULE_NAME = 'paf';

/**
 *
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
function getBidRequestData(reqBidsConfigObj, callback, rtdConfig, userConsent) {

  let idsAndPreferences;
  let seed;
  const adUnits = (reqBidsConfigObj.adUnits || getGlobal().adUnits);

  if (window.PAF) {
    idsAndPreferences = window.PAF.getIdsAndPreferences();
    if (!idsAndPreferences) {
      callback();
      return;
    }
    logMessage('DEBUG(idsAndPreferences):', idsAndPreferences);
    seed = rtdConfig.multipleTransactions ? window.PAF.getSeed() : window.PAF.getSeed(adUnits.length);
    logMessage('DEBUG(seed):', seed);
  } else {
    callback();
    return;
  }

  if (seed.transaction_ids) {
    for (var i=0; i < adUnits.length; i++) {
      deepSetValue(adUnits[i], `ortb2Imp.ext.data.paf_transaction_id`, seed.transaction_ids[i])
    }
  }

  const pafOrtb2 = {
    ortb2: {
      user: {
        ext: {
          paf: {
            seed: seed,
            identifiers: idsAndPreferences.identifiers,
            preferences: idsAndPreferences.preferences
          }
        }
      }
    }
  }

  if (rtdConfig.params && rtdConfig.params.bidders) {
    let bidderConfig = config.getBidderConfig();
    logMessage(`set ortb2 for: ${rtdConfig.params.bidders}`, pafOrtb2);
    rtdConfig.params.bidders.forEach(bidder => {
      let bidderOptions = {};
      if (isPlainObject(bidderConfig[bidder])) {
        bidderOptions = bidderConfig[bidder];
      }

      config.setBidderConfig({
        bidders: [bidder],
        config: mergeLazy(bidderOptions, pafOrtb2)
      });
    });
  } else {
    let ortb2 = config.getConfig('ortb2') || {};
    logMessage('DEBUG(set ortb2):', pafOrtb2);
    config.setConfig({ortb2: mergeLazy(ortb2, pafOrtb2.ortb2)});
  }

  callback();
}

/**
 * Lazy merge objects.
 * @param {Object} target
 * @param {Object} source
 */
 function mergeLazy(target, source) {
  if (!isPlainObject(target)) {
    target = {};
  }

  if (!isPlainObject(source)) {
    source = {};
  }

  return mergeDeep(target, source);
}

/** @type {RtdSubmodule} */
export const pafDataSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: SUBMODULE_NAME,
  init: () => true,
  getBidRequestData,
};

function registerSubModule() {
  submodule('realTimeData', pafDataSubmodule);
}

registerSubModule();
