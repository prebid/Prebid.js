import { submodule } from '../src/hook.js';
import { logError, isStr, mergeDeep } from '../src/utils.js';

import { PluginManager } from '../libraries/pubmaticUtils/plugins/pluginManager.js';
import { ConfigJsonManager } from '../libraries/pubmaticUtils/configJsonManager.js';
import { FloorProvider } from '../libraries/pubmaticUtils/plugins/floorProvider.js';
import { BidderOptimization } from '../libraries/pubmaticUtils/plugins/bidderOptimization.js';
import { UnifiedPricingRule } from '../libraries/pubmaticUtils/plugins/unifiedPricingRule.js';

/**
 * @typedef {import('./rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */
/**
 * This RTD module has a dependency on the priceFloors module.
 * We utilize the continueAuction function from the priceFloors module to incorporate price floors data into the current auction.
 */

export const CONSTANTS = Object.freeze({
  SUBMODULE_NAME: 'pubmatic',
  REAL_TIME_MODULE: 'realTimeData',
  LOG_PRE_FIX: 'PubMatic-Rtd-Provider: '
});

export let _ymConfigPromise = null;

// Create core components
const pluginManager = PluginManager();
const configManager = ConfigJsonManager();

// Register plugins
pluginManager.register('dynamicFloors', FloorProvider);
pluginManager.register('dynamicBidderOptimisation', BidderOptimization);
pluginManager.register('unifiedPricingRule', UnifiedPricingRule);

/**
 * Initialize the Pubmatic RTD Module.
 * @param {Object} config
 * @param {Object} _userConsent
 * @returns {boolean}
 */
const init = (config, _userConsent) => {
  const { publisherId, profileId } = config?.params || {};

  if (!publisherId || !isStr(publisherId) || !profileId || !isStr(profileId)) {
    logError(
      `${CONSTANTS.LOG_PRE_FIX} ${!publisherId ? 'Missing publisher Id.'
        : !isStr(publisherId) ? 'Publisher Id should be a string.'
          : !profileId ? 'Missing profile Id.'
            : 'Profile Id should be a string.'
      }`
    );
    return false;
  }

  // Fetch configuration and initialize plugins
  _ymConfigPromise = configManager.fetchConfig(publisherId, profileId)
    .then(configJson => {
      if (!configJson) {
        return Promise.reject(new Error('Failed to fetch configuration'));
      }

      return pluginManager.initialize(configJson);
    });

  return true;
};

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
  _ymConfigPromise.then(() => {
    return pluginManager.executeHook('processBidRequest', reqBidsConfigObj);
  }).then(() => {
    // Apply country information if available
    const country = configManager.country;
    if (country) {
      const ortb2 = {
        user: {
          ext: {
            ctr: country,
          }
        }
      };

      mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, {
        [CONSTANTS.SUBMODULE_NAME]: ortb2
      });
    }

    callback();
  }).catch(error => {
    logError(CONSTANTS.LOG_PRE_FIX, 'Error in updating floors :', error);
    callback();
  });
};

/**
 * Returns targeting data for ad units
 * @param {string[]} adUnitCodes - Ad unit codes
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent data
 * @param {Object} auction - Auction object
 * @return {Object} - Targeting data for ad units
 */
export const getTargetingData = (adUnitCodes, config, userConsent, auction) => {
  const results = pluginManager.executeHook('getTargeting', adUnitCodes, config, userConsent, auction);
  // As of now only unified pricing rule is implemented
  return results?.['unifiedPricingRule'] || {};
};

export const pubmaticSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: CONSTANTS.SUBMODULE_NAME,
  init,
  getBidRequestData,
  getTargetingData
};

export const registerSubModule = () => {
  submodule(CONSTANTS.REAL_TIME_MODULE, pubmaticSubmodule);
}

registerSubModule();
