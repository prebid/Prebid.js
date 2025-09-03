import { submodule } from '../src/hook.js';
import { logError, logInfo, isPlainObject, isEmpty, isFn, mergeDeep } from '../src/utils.js';
import { config as conf } from '../src/config.js';
import { getDeviceType as fetchDeviceType, getOS } from '../libraries/userAgentUtils/index.js';
import { getLowEntropySUA } from '../src/fpd/sua.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { REJECTION_REASON } from '../src/constants.js';

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
  UTM: 'utm_',
  UTM_VALUES: {
    TRUE: '1',
    FALSE: '0'
  },
  TIME_OF_DAY_VALUES: {
    MORNING: 'morning',
    AFTERNOON: 'afternoon',
    EVENING: 'evening',
    NIGHT: 'night',
  },
  ENDPOINTS: {
    BASEURL: 'https://ads.pubmatic.com/AdServer/js/pwt',
    FLOORS: 'floors.json',
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

const BROWSER_REGEX_MAP = [
  { regex: /\b(?:crios)\/([\w.]+)/i, id: 1 }, // Chrome for iOS
  { regex: /(edg|edge)(?:e|ios|a)?(?:\/([\w.]+))?/i, id: 2 }, // Edge
  { regex: /(opera|opr)(?:.+version\/|[/ ]+)([\w.]+)/i, id: 3 }, // Opera
  { regex: /(?:ms|\()(ie) ([\w.]+)|(?:trident\/[\w.]+)/i, id: 4 }, // Internet Explorer
  { regex: /fxios\/([-\w.]+)/i, id: 5 }, // Firefox for iOS
  { regex: /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w.]+);)/i, id: 6 }, // Facebook In-App Browser
  { regex: / wv\).+(chrome)\/([\w.]+)/i, id: 7 }, // Chrome WebView
  { regex: /droid.+ version\/([\w.]+)\b.+(?:mobile safari|safari)/i, id: 8 }, // Android Browser
  { regex: /(chrome|crios)(?:\/v?([\w.]+))?\b/i, id: 9 }, // Chrome
  { regex: /version\/([\w.,]+) .*mobile\/\w+ (safari)/i, id: 10 }, // Safari Mobile
  { regex: /version\/([\w(.|,]+) .*(mobile ?safari|safari)/i, id: 11 }, // Safari
  { regex: /(firefox)\/([\w.]+)/i, id: 12 } // Firefox
];

export const defaultValueTemplate = {
  currency: 'USD',
  skipRate: 0,
  schema: {
    fields: ['mediaType', 'size']
  }
};

let initTime;
let _fetchFloorRulesPromise = null; let _fetchConfigPromise = null;
export let configMerged;
// configMerged is a reference to the function that can resolve configMergedPromise whenever we want
let configMergedPromise = new Promise((resolve) => { configMerged = resolve; });
export let _country;
// Store multipliers from floors.json, will use default values from CONSTANTS if not available
export let _multipliers = null;

// Use a private variable for profile configs
let _profileConfigs;
// Export getter and setter functions for _profileConfigs
export const getProfileConfigs = () => _profileConfigs;
export const setProfileConfigs = (configs) => { _profileConfigs = configs; };

// Waits for a given promise to resolve within a timeout
export function withTimeout(promise, ms) {
  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(() => resolve(undefined), ms);
  });

  return Promise.race([promise.finally(() => clearTimeout(timeout)), timeoutPromise]);
}

// Utility Functions
export const getCurrentTimeOfDay = () => {
  const currentHour = new Date().getHours();

  return currentHour < 5 ? CONSTANTS.TIME_OF_DAY_VALUES.NIGHT
    : currentHour < 12 ? CONSTANTS.TIME_OF_DAY_VALUES.MORNING
      : currentHour < 17 ? CONSTANTS.TIME_OF_DAY_VALUES.AFTERNOON
        : currentHour < 19 ? CONSTANTS.TIME_OF_DAY_VALUES.EVENING
          : CONSTANTS.TIME_OF_DAY_VALUES.NIGHT;
}

export const getBrowserType = () => {
  const brandName = getLowEntropySUA()?.browsers
    ?.map(b => b.brand.toLowerCase())
    .join(' ') || '';
  const browserMatch = brandName ? BROWSER_REGEX_MAP.find(({ regex }) => regex.test(brandName)) : -1;

  if (browserMatch?.id) return browserMatch.id.toString();

  const userAgent = navigator?.userAgent;
  let browserIndex = userAgent == null ? -1 : 0;

  if (userAgent) {
    browserIndex = BROWSER_REGEX_MAP.find(({ regex }) => regex.test(userAgent))?.id || 0;
  }
  return browserIndex.toString();
}

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

// Getter Functions
export const getOs = () => getOS().toString();
export const getDeviceType = () => fetchDeviceType().toString();
export const getCountry = () => _country;
export const getBidder = (request) => request?.bidder;
export const getUtm = () => {
  const url = new URL(window.location?.href);
  const urlParams = new URLSearchParams(url?.search);
  return urlParams && urlParams.toString().includes(CONSTANTS.UTM) ? CONSTANTS.UTM_VALUES.TRUE : CONSTANTS.UTM_VALUES.FALSE;
}

export const getFloorsConfig = (floorsData, profileConfigs) => {
  if (!isPlainObject(profileConfigs) || isEmpty(profileConfigs)) {
    logError(`${CONSTANTS.LOG_PRE_FIX} profileConfigs is not an object or is empty`);
    return undefined;
  }

  // Floor configs from adunit / setconfig
  const defaultFloorConfig = conf.getConfig('floors') ?? {};
  if (defaultFloorConfig?.endpoint) {
    delete defaultFloorConfig.endpoint;
  }
  // Plugin data from profile
  const dynamicFloors = profileConfigs?.plugins?.dynamicFloors;

  // If plugin disabled or config not present, return undefined
  if (!dynamicFloors?.enabled || !dynamicFloors?.config) {
    return undefined;
  }

  const config = { ...dynamicFloors.config };

  // default values provided by publisher on profile
  const defaultValues = config.defaultValues ?? {};
  // If floorsData is not present, use default values
  const finalFloorsData = floorsData ?? { ...defaultValueTemplate, values: { ...defaultValues } };

  delete config.defaultValues;
  // If skiprate is provided in configs, overwrite the value in finalFloorsData
  (config.skipRate !== undefined) && (finalFloorsData.skipRate = config.skipRate);

  // merge default configs from page, configs
  return {
    floors: {
      ...defaultFloorConfig,
      ...config,
      data: finalFloorsData,
      additionalSchemaFields: {
        deviceType: getDeviceType,
        timeOfDay: getCurrentTimeOfDay,
        browser: getBrowserType,
        os: getOs,
        utm: getUtm,
        country: getCountry,
        bidder: getBidder,
      },
    },
  };
};

export const fetchData = async (publisherId, profileId, type) => {
  try {
    const endpoint = CONSTANTS.ENDPOINTS[type];
    const baseURL = (type === 'FLOORS') ? `${CONSTANTS.ENDPOINTS.BASEURL}/floors` : CONSTANTS.ENDPOINTS.BASEURL;
    const url = `${baseURL}/${publisherId}/${profileId}/${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching ${type}: Not ok`);
      return;
    }

    if (type === "FLOORS") {
      const cc = response.headers?.get('country_code');
      _country = cc ? cc.split(',')?.map(code => code.trim())[0] : undefined;
    }

    const data = await response.json();

    // Extract multipliers from floors.json if available
    if (type === "FLOORS" && data && data.multiplier) {
      // Map of source keys to destination keys
      const multiplierKeys = {
        'win': 'WIN',
        'floored': 'FLOORED',
        'nobid': 'NOBID'
      };

      // Initialize _multipliers and only add keys that exist in data.multiplier
      _multipliers = Object.entries(multiplierKeys)
        .reduce((acc, [srcKey, destKey]) => {
          if (srcKey in data.multiplier) {
            acc[destKey] = data.multiplier[srcKey];
          }
          return acc;
        }, {});

      logInfo(CONSTANTS.LOG_PRE_FIX, `Using multipliers from floors.json: ${JSON.stringify(_multipliers)}`);
    }

    return data;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching ${type}: ${error}`);
  }
};

/**
 * Initialize the Pubmatic RTD Module.
 * @param {Object} config
 * @param {Object} _userConsent
 * @returns {boolean}
 */
const init = (config, _userConsent) => {
  initTime = Date.now(); // Capture the initialization time
  let { publisherId, profileId } = config?.params || {};

  if (!publisherId || !profileId) {
    logError(`${CONSTANTS.LOG_PRE_FIX} ${!publisherId ? 'Missing publisher Id.' : 'Missing profile Id.'}`);
    return false;
  }

  publisherId = String(publisherId).trim();
  profileId = String(profileId).trim();

  if (!isFn(continueAuction)) {
    logError(`${CONSTANTS.LOG_PRE_FIX} continueAuction is not a function. Please ensure to add priceFloors module.`);
    return false;
  }

  _fetchFloorRulesPromise = fetchData(publisherId, profileId, "FLOORS");
  _fetchConfigPromise = fetchData(publisherId, profileId, "CONFIGS");

  _fetchConfigPromise.then(async (profileConfigs) => {
    const auctionDelay = conf?.getConfig('realTimeData')?.auctionDelay || 300;
    const maxWaitTime = 0.8 * auctionDelay;

    const elapsedTime = Date.now() - initTime;
    const remainingTime = Math.max(maxWaitTime - elapsedTime, 0);
    const floorsData = await withTimeout(_fetchFloorRulesPromise, remainingTime);

    // Store the profile configs globally
    setProfileConfigs(profileConfigs);

    const floorsConfig = getFloorsConfig(floorsData, profileConfigs);
    floorsConfig && conf?.setConfig(floorsConfig);
    configMerged();
  });

  return true;
};

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
  configMergedPromise.then(() => {
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
