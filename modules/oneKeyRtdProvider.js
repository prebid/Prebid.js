
import { submodule } from '../src/hook.js';
import { mergeDeep, logError, logMessage, deepSetValue, generateUUID } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';

const SUBMODULE_NAME = 'oneKey';
const prefixLog = 'OneKey.RTD-module'

// Pre-init OneKey if it has not load yet.
window.OneKey = window.OneKey || {};
window.OneKey.queue = window.OneKey.queue || [];

/**
 * Generate the OneKey transmission and include it in the Bid Request.
 *
 * Modify the AdUnit object for each auction.
 * It’s called as part of the requestBids hook.
 * https://docs.prebid.org/dev-docs/add-rtd-submodule.html#getbidrequestdata
 *
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} rtdConfig
 * @param {Object} userConsent
 */
const getTransmissionInBidRequest = (reqBidsConfigObj, done, rtdConfig) => {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  const transactionIds = adUnits.map(() => generateUUID());

  logMessage(prefixLog, 'Queue seed generation.');
  window.OneKey.queue.push(() => {
    logMessage(prefixLog, 'Generate a seed.');
    window.OneKey.generateSeed(transactionIds)
      .then(onGetSeed(reqBidsConfigObj, rtdConfig, adUnits, transactionIds))
      .catch((err) => { logError(SUBMODULE_NAME, err.message); })
      .finally(done);
  });
}

const onGetSeed = (reqBidsConfigObj, rtdConfig, adUnits, transactionIds) => {
  return (seed) => {
    if (!seed) {
      logMessage(prefixLog, 'No seed generated.');
      return;
    }

    logMessage(prefixLog, 'Has retrieved a seed:', seed);
    addTransactionIdsToAdUnits(adUnits, transactionIds);
    addTransmissionToOrtb2(reqBidsConfigObj, rtdConfig, seed);
  };
};

const addTransactionIdsToAdUnits = (adUnits, transactionIds) => {
  adUnits.forEach((unit, index) => {
    deepSetValue(unit, `ortb2Imp.ext.data.paf.transaction_id`, transactionIds[index]);
  });
};

const addTransmissionToOrtb2 = (reqBidsConfigObj, rtdConfig, seed) => {
  const okOrtb2 = {
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

  const shareSeedWithAllBidders = !rtdConfig.params || !rtdConfig.params.bidders;
  if (shareSeedWithAllBidders) {
    // Change global first party data with OneKey
    logMessage(prefixLog, 'set ortb2:', okOrtb2);
    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, okOrtb2.ortb2);
  } else {
    // Change bidder-specific first party data with OneKey
    logMessage(prefixLog, `set ortb2 for: ${rtdConfig.params.bidders.join(',')}`, okOrtb2);
    rtdConfig.params.bidders.forEach(bidder => {
      mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, { [bidder]: okOrtb2.ortb2 });
    });
  }
};

/** @type {RtdSubmodule} */
export const oneKeyDataSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: SUBMODULE_NAME,
  init: () => true,
  getBidRequestData: getTransmissionInBidRequest,
};

submodule('realTimeData', oneKeyDataSubmodule);
