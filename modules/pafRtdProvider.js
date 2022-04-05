
import { submodule } from '../src/hook.js';
import { mergeDeep, isPlainObject, logError, logMessage, deepSetValue, generateUUID } from '../src/utils.js';
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
export function getBidRequestData(reqBidsConfigObj, onDone, rtdConfig, userConsent) {
  let idsAndPreferences;
  const adUnits = (reqBidsConfigObj.adUnits || getGlobal().adUnits);

  if (rtdConfig.params && rtdConfig.params.proxyHostName && window.PAF) {
    idsAndPreferences = window.PAF.getIdsAndPreferences();
    if (!idsAndPreferences) {
      onDone();
      logMessage(SUBMODULE_NAME, 'No id and preferences. Not creating Seed.');
      return;
    }

    let transactionIds = [];
    for (var i = 0; i < adUnits.length; i++) {
      const uuid = generateUUID();
      transactionIds.push(uuid)
      deepSetValue(adUnits[i], `ortb2Imp.ext.data.paf.transaction_id`, uuid)
    }

    window.PAF.generateSeed({proxyHostName: rtdConfig.params.proxyHostName, callback: function (seed) { setData(seed, rtdConfig, onDone); }}, transactionIds)
  } else {
    onDone();
  }
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

export function setData(seed, rtdConfig, onDone) {
  if (!seed) {
    logError(SUBMODULE_NAME, 'Could not createSeed');
    onDone()
    return;
  }
  logMessage(SUBMODULE_NAME, 'Created Seed:', seed);
  const pafOrtb2 = {
    ortb2: {
      user: {
        ext: {
          paf: {
            transmission: {
              seed
            }
          }
        }
      }
    }
  }

  if (rtdConfig.params && rtdConfig.params.bidders) {
    let bidderConfig = config.getBidderConfig();
    logMessage(SUBMODULE_NAME, `set ortb2 for: ${rtdConfig.params.bidders}`, pafOrtb2);
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
    logMessage(SUBMODULE_NAME, 'set ortb2:', pafOrtb2);
    config.setConfig({ortb2: mergeLazy(ortb2, pafOrtb2.ortb2)});
  }
  onDone();
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
