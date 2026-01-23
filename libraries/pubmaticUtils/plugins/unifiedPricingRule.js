// plugins/unifiedPricingRule.js
import { logError, logInfo } from '../../../src/utils.js';
import { getGlobal } from '../../../src/prebidGlobal.js';
import { REJECTION_REASON } from '../../../src/constants.js';

const CONSTANTS = Object.freeze({
  LOG_PRE_FIX: 'PubMatic-Unified-Pricing-Rule: ',
  BID_STATUS: {
    NOBID: 0,
    WON: 1,
    FLOORED: 2
  },
  MULTIPLIERS: {
    WIN: 1.0,
    FLOORED: 1.0,
    NOBID: 1.0
  },
  TARGETING_KEYS: {
    PM_YM_FLRS: 'pm_ym_flrs', // Whether RTD floor was applied
    PM_YM_FLRV: 'pm_ym_flrv', // Final floor value (after applying multiplier)
    PM_YM_BID_S: 'pm_ym_bid_s' // Bid status (0: No bid, 1: Won, 2: Floored)
  }
});
export const getProfileConfigs = () => getConfigJsonManager()?.getYMConfig();

let _configJsonManager = null;
export const getConfigJsonManager = () => _configJsonManager;
export const setConfigJsonManager = (configJsonManager) => { _configJsonManager = configJsonManager; }

/**
 * Initialize the floor provider
 * @param {Object} pluginName - Plugin name
 * @param {Object} configJsonManager - Configuration JSON manager object
 * @returns {Promise<boolean>} - Promise resolving to initialization status
 */
export async function init(pluginName, configJsonManager) {
  setConfigJsonManager(configJsonManager);
  return true;
}

/**
 * Process bid request
 * @param {Object} reqBidsConfigObj - Bid request config object
 * @returns {Object} - Updated bid request config object
 */
export function processBidRequest(reqBidsConfigObj) {
  return reqBidsConfigObj;
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
  // Access the profile configs stored globally
  const profileConfigs = getProfileConfigs();

  // Return empty object if profileConfigs is undefined or pmTargetingKeys.enabled is explicitly set to false
  if (!profileConfigs || profileConfigs?.plugins?.dynamicFloors?.pmTargetingKeys?.enabled === false) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} pmTargetingKeys is disabled or profileConfigs is undefined`);
    return {};
  }

  // Helper to check if RTD floor is applied to a bid
  const isRtdFloorApplied = bid => bid.floorData?.floorProvider === "PM" && !bid.floorData.skipped;

  // Check if any bid has RTD floor applied
  const hasRtdFloorAppliedBid =
    auction?.adUnits?.some(adUnit => adUnit.bids?.some(isRtdFloorApplied)) ||
    auction?.bidsReceived?.some(isRtdFloorApplied);

  // Only log when RTD floor is applied
  if (hasRtdFloorAppliedBid) {
    logInfo(CONSTANTS.LOG_PRE_FIX, 'Setting targeting via getTargetingData:');
  }

  // Process each ad unit code
  const targeting = {};

  adUnitCodes.forEach(code => {
    targeting[code] = {};

    // For non-RTD floor applied cases, only set pm_ym_flrs to 0
    if (!hasRtdFloorAppliedBid) {
      targeting[code][CONSTANTS.TARGETING_KEYS.PM_YM_FLRS] = 0;
      return;
    }

    // Find bids and determine status for RTD floor applied cases
    const bidsForAdUnit = findBidsForAdUnit(auction, code);
    const rejectedBidsForAdUnit = findRejectedBidsForAdUnit(auction, code);
    const rejectedFloorBid = findRejectedFloorBid(rejectedBidsForAdUnit);
    const winningBid = findWinningBid(code);

    // Determine bid status and values
    const { bidStatus, baseValue, multiplier } = determineBidStatusAndValues(
      winningBid,
      rejectedFloorBid,
      bidsForAdUnit,
      auction,
      code
    );

    // Set all targeting keys
    targeting[code][CONSTANTS.TARGETING_KEYS.PM_YM_FLRS] = 1;
    targeting[code][CONSTANTS.TARGETING_KEYS.PM_YM_FLRV] = (baseValue * multiplier).toFixed(2);
    targeting[code][CONSTANTS.TARGETING_KEYS.PM_YM_BID_S] = bidStatus;
  });

  return targeting;
}

// Export the floor provider functions
export const UnifiedPricingRule = {
  init,
  processBidRequest,
  getTargeting
};

// Find all bids for a specific ad unit
function findBidsForAdUnit(auction, code) {
  return auction?.bidsReceived?.filter(bid => bid.adUnitCode === code) || [];
}

// Find rejected bids for a specific ad unit
function findRejectedBidsForAdUnit(auction, code) {
  if (!auction?.bidsRejected) return [];

  // If bidsRejected is an array
  if (Array.isArray(auction.bidsRejected)) {
    return auction.bidsRejected.filter(bid => bid.adUnitCode === code);
  }

  // If bidsRejected is an object mapping bidders to their rejected bids
  if (typeof auction.bidsRejected === 'object') {
    return Object.values(auction.bidsRejected)
      .filter(Array.isArray)
      .flatMap(bidderBids => bidderBids.filter(bid => bid.adUnitCode === code));
  }

  return [];
}

// Find a rejected bid due to price floor
function findRejectedFloorBid(rejectedBids) {
  return rejectedBids.find(bid => {
    return bid.rejectionReason === REJECTION_REASON.FLOOR_NOT_MET &&
      (bid.floorData?.floorValue && bid.cpm < bid.floorData.floorValue);
  });
}

// Find the winning or highest bid for an ad unit
function findWinningBid(adUnitCode) {
  try {
    const pbjs = getGlobal();
    if (!pbjs?.getHighestCpmBids) return null;

    const highestCpmBids = pbjs.getHighestCpmBids(adUnitCode);
    if (!highestCpmBids?.length) {
      logInfo(CONSTANTS.LOG_PRE_FIX, `No highest CPM bids found for ad unit: ${adUnitCode}`);
      return null;
    }

    const highestCpmBid = highestCpmBids[0];
    logInfo(CONSTANTS.LOG_PRE_FIX, `Found highest CPM bid using pbjs.getHighestCpmBids() for ad unit: ${adUnitCode}, CPM: ${highestCpmBid.cpm}`);
    return highestCpmBid;
  } catch (error) {
    logError(CONSTANTS.LOG_PRE_FIX, `Error finding highest CPM bid: ${error}`);
    return null;
  }
}

// Find floor value from bidder requests
function findFloorValueFromBidderRequests(auction, code) {
  if (!auction?.bidderRequests?.length) return 0;

  // Find all bids in bidder requests for this ad unit
  const bidsFromRequests = auction.bidderRequests
    .flatMap(request => request.bids || [])
    .filter(bid => bid.adUnitCode === code);

  if (!bidsFromRequests.length) {
    logInfo(CONSTANTS.LOG_PRE_FIX, `No bids found for ad unit: ${code}`);
    return 0;
  }

  const bidWithGetFloor = bidsFromRequests.find(bid => bid.getFloor);
  if (!bidWithGetFloor) {
    logInfo(CONSTANTS.LOG_PRE_FIX, `No bid with getFloor method found for ad unit: ${code}`);
    return 0;
  }

  // Helper function to extract sizes with their media types from a source object
  const extractSizes = (source) => {
    if (!source) return null;

    const result = [];

    // Extract banner sizes
    if (source.mediaTypes?.banner?.sizes) {
      source.mediaTypes.banner.sizes.forEach(size => {
        result.push({
          size,
          mediaType: 'banner'
        });
      });
    }

    // Extract video sizes
    if (source.mediaTypes?.video?.playerSize) {
      const playerSize = source.mediaTypes.video.playerSize;
      // Handle both formats: [[w, h]] and [w, h]
      const videoSizes = Array.isArray(playerSize[0]) ? playerSize : [playerSize];

      videoSizes.forEach(size => {
        result.push({
          size,
          mediaType: 'video'
        });
      });
    }

    // Use general sizes as fallback if no specific media types found
    if (result.length === 0 && source.sizes) {
      source.sizes.forEach(size => {
        result.push({
          size,
          mediaType: 'banner' // Default to banner for general sizes
        });
      });
    }

    return result.length > 0 ? result : null;
  };

  // Try to get sizes from different sources in order of preference
  const adUnit = auction.adUnits?.find(unit => unit.code === code);
  let sizes = extractSizes(adUnit) || extractSizes(bidWithGetFloor);

  // Handle fallback to wildcard size if no sizes found
  if (!sizes) {
    sizes = [{ size: ['*', '*'], mediaType: 'banner' }];
    logInfo(CONSTANTS.LOG_PRE_FIX, `No sizes found, using wildcard size for ad unit: ${code}`);
  }

  // Try to get floor values for each size
  let minFloor = -1;

  for (const sizeObj of sizes) {
    // Extract size and mediaType from the object
    const { size, mediaType } = sizeObj;

    // Call getFloor with the appropriate media type
    const floorInfo = bidWithGetFloor.getFloor({
      currency: 'USD', // Default currency
      mediaType: mediaType, // Use the media type we extracted
      size: size
    });

    if (floorInfo?.floor && !isNaN(parseFloat(floorInfo.floor))) {
      const floorValue = parseFloat(floorInfo.floor);
      logInfo(CONSTANTS.LOG_PRE_FIX, `Floor value for ${mediaType} size ${size}: ${floorValue}`);

      // Update minimum floor value
      minFloor = minFloor === -1 ? floorValue : Math.min(minFloor, floorValue);
    }
  }

  if (minFloor !== -1) {
    logInfo(CONSTANTS.LOG_PRE_FIX, `Calculated minimum floor value ${minFloor} for ad unit: ${code}`);
    return minFloor;
  }

  logInfo(CONSTANTS.LOG_PRE_FIX, `No floor data found for ad unit: ${code}`);
  return 0;
}

// Select multiplier based on priority order: floors.json → config.json → default
function selectMultiplier(multiplierKey, profileConfigs) {
  // Define sources in priority order
  const multiplierSources = [
    {
      name: 'config.json',
      getValue: () => {
        const configPath = profileConfigs?.plugins?.dynamicFloors?.pmTargetingKeys?.multiplier;
        const lowerKey = multiplierKey.toLowerCase();
        return configPath && lowerKey in configPath ? configPath[lowerKey] : null;
      }
    },
    {
      name: 'floor.json',
      getValue: () => {
        const configPath = profileConfigs?.plugins?.dynamicFloors?.data?.multiplier;
        const lowerKey = multiplierKey.toLowerCase();
        return configPath && lowerKey in configPath ? configPath[lowerKey] : null;
      }
    },
    {
      name: 'default',
      getValue: () => CONSTANTS.MULTIPLIERS[multiplierKey]
    }
  ];

  // Find the first source with a non-null value
  for (const source of multiplierSources) {
    const value = source.getValue();
    if (value != null) {
      return { value, source: source.name };
    }
  }

  // Fallback (shouldn't happen due to default source)
  return { value: CONSTANTS.MULTIPLIERS[multiplierKey], source: 'default' };
}

// Identify winning bid scenario and return scenario data
function handleWinningBidScenario(winningBid, code) {
  return {
    scenario: 'winning',
    bidStatus: CONSTANTS.BID_STATUS.WON,
    baseValue: winningBid.cpm,
    multiplierKey: 'WIN',
    logMessage: `Bid won for ad unit: ${code}, CPM: ${winningBid.cpm}`
  };
}

// Identify rejected floor bid scenario and return scenario data
function handleRejectedFloorBidScenario(rejectedFloorBid, code) {
  const baseValue = rejectedFloorBid.floorData?.floorValue || 0;
  return {
    scenario: 'rejected',
    bidStatus: CONSTANTS.BID_STATUS.FLOORED,
    baseValue,
    multiplierKey: 'FLOORED',
    logMessage: `Bid rejected due to price floor for ad unit: ${code}, Floor value: ${baseValue}, Bid CPM: ${rejectedFloorBid.cpm}`
  };
}

// Identify no bid scenario and return scenario data
function handleNoBidScenario(auction, code) {
  const baseValue = findFloorValueFromBidderRequests(auction, code);
  return {
    scenario: 'nobid',
    bidStatus: CONSTANTS.BID_STATUS.NOBID,
    baseValue,
    multiplierKey: 'NOBID',
    logMessage: `No bids for ad unit: ${code}, Floor value: ${baseValue}`
  };
}

// Determine which scenario applies based on bid conditions
function determineScenario(winningBid, rejectedFloorBid, bidsForAdUnit, auction, code) {
  return winningBid ? handleWinningBidScenario(winningBid, code)
    : rejectedFloorBid ? handleRejectedFloorBidScenario(rejectedFloorBid, code)
      : handleNoBidScenario(auction, code);
}

// Main function that determines bid status and calculates values
function determineBidStatusAndValues(winningBid, rejectedFloorBid, bidsForAdUnit, auction, code) {
  const profileConfigs = getProfileConfigs();

  // Determine the scenario based on bid conditions
  const { bidStatus, baseValue, multiplierKey, logMessage } =
    determineScenario(winningBid, rejectedFloorBid, bidsForAdUnit, auction, code);

  // Select the appropriate multiplier
  const { value: multiplier, source } = selectMultiplier(multiplierKey, profileConfigs);
  logInfo(CONSTANTS.LOG_PRE_FIX, logMessage + ` (Using ${source} multiplier: ${multiplier})`);

  return { bidStatus, baseValue, multiplier };
}
