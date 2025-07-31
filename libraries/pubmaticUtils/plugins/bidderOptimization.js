// plugins/bidderOptimization.js
import { setBidderOptimisationConfig, getBidderDecision } from '../bidderOptimisation.js';
import { getBrowserType } from '../pubmaticUtils.js';
import { logInfo, logError } from '../../../src/utils.js';

const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Bidder-Optimization: '
});

/**
 * Initialize the bidder optimization plugin
 * @param {Object} bidderOptimisationConfig - Bidder optimization configuration
 * @returns {Promise<boolean>} - Promise resolving to initialization status
 */
export async function init(bidderOptimisationConfig) {
  // Process bidder optimization configuration
  try {
    setBidderOptimisationConfig(bidderOptimisationConfig);
    logInfo(`${CONSTANTS.LOG_PRE_FIX} Bidder optimization configuration set successfully`);
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error setting bidder optimization config: ${error}`);
  }

  return true;
}

/**
 * Process bid request
 * @param {Object} reqBidsConfigObj - Bid request config object
 * @returns {Object} - Updated bid request config object
 */
export async function processBidRequest(reqBidsConfigObj) {
  try {
    const decision = getBidderDecision({
      auctionId: reqBidsConfigObj?.auctionId,
      browser: getBrowserType(),
      reqBidsConfigObj
    });

    // Apply bidder decisions
    if (decision && decision.excludedBiddersByAdUnit) {
      for (const [adUnitCode, bidderList] of Object.entries(decision.excludedBiddersByAdUnit)) {
        filterBidders(bidderList, reqBidsConfigObj, adUnitCode);
      }
      logInfo(`${CONSTANTS.LOG_PRE_FIX} Applied bidder optimization decisions`);
    }

    return reqBidsConfigObj;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error in bidder optimization: ${error}`);
    return reqBidsConfigObj;
  }
}

/**
 * Get targeting data
 * @param {Array} adUnitCodes - Ad unit codes
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent data
 * @param {Object} auction - Auction object
 * @returns {Object} - Targeting data
 */
export function getTargeting(adUnitCodes, config, userConsent, auction) {
  // Implementation for targeting data, if not applied then do nothing
}

// Export the bidder optimization functions
export const BidderOptimization = {
  init,
  processBidRequest,
  getTargeting
};

/**
 * Filter out specified bidders from adUnits with matching code
 * @param {Array} bidderList - List of bidder names to be filtered out
 * @param {Object} reqBidsConfigObj - The bid request configuration object
 * @param {string} adUnitCode - The code of the adUnit to filter bidders from
 */
export const filterBidders = (bidderList, reqBidsConfigObj, adUnitCode) => {
  // Validate inputs
  if (!bidderList || !Array.isArray(bidderList) || bidderList.length === 0 ||
      !reqBidsConfigObj || !reqBidsConfigObj.adUnits || !Array.isArray(reqBidsConfigObj.adUnits)) {
    return;
  }
  // Find the adUnit with the matching code
  const adUnit = reqBidsConfigObj.adUnits.find(unit => unit.code === adUnitCode);

  // If adUnit exists and has bids array, filter out the specified bidders
  if (adUnit && adUnit.bids && Array.isArray(adUnit.bids)) {
    adUnit.bids = adUnit.bids.filter(bid => !bidderList.includes(bid.bidder));
  }
};
