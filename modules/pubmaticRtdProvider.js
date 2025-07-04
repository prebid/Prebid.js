import { submodule } from '../src/hook.js';
import { logError, logInfo, isStr, isPlainObject, isEmpty, isFn, mergeDeep, logMessage } from '../src/utils.js';
import { config as conf } from '../src/config.js';
import { getDeviceType as fetchDeviceType, getOS } from '../libraries/userAgentUtils/index.js';
import { getBrowserType, getCurrentTimeOfDay, getUtmValue } from '../libraries/pubmaticUtils/pubmaticUtils.js';
import { getGlobal } from '../src/prebidGlobal.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

/**
 * This RTD module has a dependency on the priceFloors module.
 * We utilize the continueAuction function from the priceFloors module to incorporate price floors data into the current auction.
 */
import { continueAuction } from './priceFloors.js'; // eslint-disable-line prebid/validate-imports

export const CONSTANTS = Object.freeze({
  SUBMODULE_NAME: 'pubmatic',
  REAL_TIME_MODULE: 'realTimeData',
  LOG_PRE_FIX: 'PubMatic-Rtd-Provider: ',
  ENDPOINTS: {
    BASEURL: 'https://ads.pubmatic.com/AdServer/js/pwt',
    CONFIGS: 'config.json'
  },
  BID_STATUS: {
    NOBID: 0,
    WON: 1,
    FLOORED: 2
  },
  MULTIPLIERS: {
    WIN: 1.0,
    FLOORED: 0.8,
    NOBID: 1.2
  },
  TARGETING_KEYS: {
    PM_YM_FLRS: 'pm_ym_flrs', // Whether RTD floor was applied
    PM_YM_FLRV: 'pm_ym_flrv', // Final floor value (after applying multiplier)
    PM_YM_BID_S: 'pm_ym_bid_s' // Bid status (0: No bid, 1: Won, 2: Floored)
  }
});

export const defaultValueTemplate = {
    currency: 'USD',
    skipRate: 0,
    schema: {
        fields: ['mediaType', 'size']
    }
};

export let _ymConfigPromise = null;
export let _configData = {};
export let _country;
// Store multipliers from floors.json, will use default values from CONSTANTS if not available
export let _multipliers = null;

// Use a private variable for profile configs
let _profileConfigs;
// Export getter and setter functions for _profileConfigs
export const getProfileConfigs = () => _profileConfigs;
export const setProfileConfigs = (configs) => { _profileConfigs = configs; };

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
    const errorMessage = bid.statusMessage || bid.status || '';
    return errorMessage.includes('price floor') ||
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

// Find a bid with the minimum floor value
function findBidWithFloor(bids) {
  let bidWithMinFloor = null;
  let minFloorValue = Infinity;

  if (!bids || !bids.length) return null;

  for (const bid of bids) {
    if (bid.floorData?.floorValue &&
        !isNaN(parseFloat(bid.floorData.floorValue)) &&
        parseFloat(bid.floorData.floorValue) < minFloorValue) {
      minFloorValue = parseFloat(bid.floorData.floorValue);
      bidWithMinFloor = bid;
    }
  }

  // Log the result for debugging
  if (bidWithMinFloor) {
    logInfo(CONSTANTS.LOG_PRE_FIX, `Found bid with minimum floor value: ${minFloorValue}`);
  }

  return bidWithMinFloor;
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
      getValue: () => _multipliers && multiplierKey in _multipliers ? _multipliers[multiplierKey] : null
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

// Identify floored bid scenario and return scenario data
function handleFlooredBidScenario(bidWithFloor, code) {
  const baseValue = bidWithFloor.floorData.floorValue;
  return {
    scenario: 'floored',
    bidStatus: CONSTANTS.BID_STATUS.FLOORED,
    baseValue,
    multiplierKey: 'FLOORED',
    logMessage: `Floored bid for ad unit: ${code}, Floor value: ${baseValue}`
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
  if (winningBid) {
    return handleWinningBidScenario(winningBid, code);
  }

  if (rejectedFloorBid) {
    return handleRejectedFloorBidScenario(rejectedFloorBid, code);
  }

  const bidWithFloor = findBidWithFloor(bidsForAdUnit);
  if (bidWithFloor?.floorData?.floorValue) {
    return handleFlooredBidScenario(bidWithFloor, code);
  }

  return handleNoBidScenario(auction, code);
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

// Getter Functions
export const getTimeOfDay = () => getCurrentTimeOfDay();
export const getBrowser = () => getBrowserType();
export const getOs = () => getOS().toString();
export const getDeviceType = () => fetchDeviceType().toString();
export const getCountry = () => _country;
export const getBidder = (request) => request?.bidder;
export const getUtm = () => getUtmValue();

export const setFloorsConfig = () => {
    const dynamicFloors = _configData?.plugins?.dynamicFloors;

    // Extract multipliers from floors.json if available
    if (dynamicFloors?.data?.multiplier) {
      // Map of source keys to destination keys
      const multiplierKeys = {
        'win': 'WIN',
        'floored': 'FLOORED',
        'nobid': 'NOBID'
      };

      // Initialize _multipliers and only add keys that exist in data.multiplier
      _multipliers = Object.entries(multiplierKeys)
        .reduce((acc, [srcKey, destKey]) => {
          if (srcKey in dynamicFloors.data.multiplier) {
            acc[destKey] = dynamicFloors.data.multiplier[srcKey];
          }
          return acc;
        }, {});

      logInfo(CONSTANTS.LOG_PRE_FIX, `Using multipliers from floors.json: ${JSON.stringify(_multipliers)}`);
    }

    if (!dynamicFloors?.enabled || !dynamicFloors?.config) {
      return undefined;
    }

    // Floor configs from adunit / setconfig
    const defaultFloorConfig = conf.getConfig('floors') ?? {};
    if (defaultFloorConfig?.endpoint) {
      delete defaultFloorConfig.endpoint;
    }

    let ymUiConfig = { ...dynamicFloors.config };

    // default values provided by publisher on YM UI
    const defaultValues = ymUiConfig.defaultValues ?? {};
    // If floorsData is not present, use default values
    const ymFloorsData = dynamicFloors.data ?? { ...defaultValueTemplate, values: { ...defaultValues } };

    delete ymUiConfig.defaultValues;
    // If skiprate is provided in configs, overwrite the value in ymFloorsData
    (ymUiConfig.skipRate !== undefined) && (ymFloorsData.skipRate = ymUiConfig.skipRate);

    // merge default configs from page, configs
    return {
        floors: {
            ...defaultFloorConfig,
            ...ymUiConfig,
            data: ymFloorsData,
            additionalSchemaFields: {
                deviceType: getDeviceType,
                timeOfDay: getTimeOfDay,
                browser: getBrowser,
                os: getOs,
                utm: getUtm,
                country: getCountry,
                bidder: getBidder,
            },
        },
    };
};

export const getRtdConfig = async (publisherId, profileId) => {
  const apiResponse = await fetchData(publisherId, profileId);

  if (!isPlainObject(apiResponse) || isEmpty(apiResponse)) {
    logError(`${CONSTANTS.LOG_PRE_FIX} profileConfigs is not an object or is empty`);
  } else {
    // Check for each module in config
    if (apiResponse.plugins?.dynamicFloors) {
      try {
        conf.setConfig(setFloorsConfig());
        logMessage(`${CONSTANTS.LOG_PRE_FIX} dynamicFloors config set successfully`);
      } catch (error) {
        logError(`${CONSTANTS.LOG_PRE_FIX} Error setting dynamicFloors config: ${error}`);
      }
    }
  }
};

export const fetchData = async (publisherId, profileId) => {
    try {
      const url = `${CONSTANTS.ENDPOINTS.BASEURL}/${publisherId}/${profileId}/${CONSTANTS.ENDPOINTS.CONFIGS}`;
      const response = await fetch(url);

      if (!response.ok) {
        logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: Not ok`);
        return;
      }

      const cc = response.headers?.get('country_code');
      _country = cc ? cc.split(',')?.map(code => code.trim())[0] : undefined;
      _configData = await response.json();
      setProfileConfigs(_configData);

      return _configData;
    } catch (error) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: ${error}`);
    }
};

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

    if (!isFn(continueAuction)) {
      logError(`${CONSTANTS.LOG_PRE_FIX} continueAuction is not a function. Please ensure to add priceFloors module.`);
      return false;
    }

    _ymConfigPromise = getRtdConfig(publisherId, profileId);

    return true;
};

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
  _ymConfigPromise.then(() => {
        const hookConfig = {
            reqBidsConfigObj,
            context: this,
            nextFn: () => true,
            haveExited: false,
            timer: null
        };
        continueAuction(hookConfig);
        if (_country) {
          const ortb2 = {
              user: {
                  ext: {
                      ctr: _country,
                  }
              }
          }

          mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, {
              [CONSTANTS.SUBMODULE_NAME]: ortb2
          });
        }
        callback();
    }).catch((error) => {
        logError(CONSTANTS.LOG_PRE_FIX, 'Error in updating floors :', error);
        callback();
    });
}

/**
 * Returns targeting data for ad units
 * @param {string[]} adUnitCodes - Ad unit codes
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent data
 * @param {Object} auction - Auction object
 * @return {Object} - Targeting data for ad units
 */
export const getTargetingData = (adUnitCodes, config, userConsent, auction) => {
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
