import { submodule } from '../src/hook.js';
import { logError, logInfo, isStr, isPlainObject, isEmpty, isFn, mergeDeep } from '../src/utils.js';
import { config as conf } from '../src/config.js';
import { getDeviceType as fetchDeviceType, getOS } from '../libraries/userAgentUtils/index.js';
import { getLowEntropySUA } from '../src/fpd/sua.js';
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
    NOBID: 1.6
  },
  TARGETING_KEYS: {
    PM_YM_FLRS: 'pm_ym_flrs', // Whether RTD floor was applied
    PM_YM_FLRV: 'pm_ym_flrv', // Final floor value (after applying multiplier)
    PM_YM_BID_S: 'pm_ym_bid_s' // Bid status (0: No bid, 1: Won, 2: Floored)
  }
});

const BROWSER_REGEX_MAP = [
  { regex: /\b(?:crios)\/([\w\.]+)/i, id: 1 }, // Chrome for iOS
  { regex: /(edg|edge)(?:e|ios|a)?(?:\/([\w\.]+))?/i, id: 2 }, // Edge
  { regex: /(opera|opr)(?:.+version\/|[\/ ]+)([\w\.]+)/i, id: 3 }, // Opera
  { regex: /(?:ms|\()(ie) ([\w\.]+)|(?:trident\/[\w\.]+)/i, id: 4 }, // Internet Explorer
  { regex: /fxios\/([-\w\.]+)/i, id: 5 }, // Firefox for iOS
  { regex: /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i, id: 6 }, // Facebook In-App Browser
  { regex: / wv\).+(chrome)\/([\w\.]+)/i, id: 7 }, // Chrome WebView
  { regex: /droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i, id: 8 }, // Android Browser
  { regex: /(chrome|crios)(?:\/v?([\w\.]+))?\b/i, id: 9 }, // Chrome
  { regex: /version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i, id: 10 }, // Safari Mobile
  { regex: /version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i, id: 11 }, // Safari
  { regex: /(firefox)\/([\w\.]+)/i, id: 12 } // Firefox
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

// Getter Functions
export const getOs = () => getOS().toString();
export const getDeviceType = () => fetchDeviceType().toString();
export const getCountry = () => _country;
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

    let config = { ...dynamicFloors.config };

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
            },
        },
    };
};

export const fetchData = async (publisherId, profileId, type) => {
    try {
      const endpoint = CONSTANTS.ENDPOINTS[type];
      const baseURL = (type == 'FLOORS') ? `${CONSTANTS.ENDPOINTS.BASEURL}/floors` : CONSTANTS.ENDPOINTS.BASEURL;
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
        _multipliers = {
          WIN: data.multiplier.win || CONSTANTS.MULTIPLIERS.WIN,
          FLOORED: data.multiplier.floored || CONSTANTS.MULTIPLIERS.FLOORED,
          NOBID: data.multiplier.nobid || CONSTANTS.MULTIPLIERS.NOBID
        };
        logInfo(CONSTANTS.LOG_PRE_FIX, `Using multipliers from floors.json: ${JSON.stringify(_multipliers)}`);
      }
      
      return data;
    } catch (error) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching ${type}:`, error);
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

    _fetchFloorRulesPromise = fetchData(publisherId, profileId, "FLOORS");
    _fetchConfigPromise = fetchData(publisherId, profileId, "CONFIGS");

    _fetchConfigPromise.then(async (profileConfigs) => {
      const auctionDelay = conf.getConfig('realTimeData').auctionDelay;
      const maxWaitTime = 0.8 * auctionDelay;

      const elapsedTime = Date.now() - initTime;
      const remainingTime = Math.max(maxWaitTime - elapsedTime, 0);
      const floorsData = await withTimeout(_fetchFloorRulesPromise, remainingTime);

      // Store the profile configs globally
      setProfileConfigs(profileConfigs);

      const floorsConfig = getFloorsConfig(floorsData, profileConfigs);
      floorsConfig && conf.setConfig(floorsConfig);
      configMerged();
    });

    return true;
};

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
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
// Find all bids for a specific ad unit
function findBidsForAdUnit(auction, code) {
  return auction?.bidsReceived?.filter(bid => bid.adUnitCode === code) || [];
}

// Find rejected bids for a specific ad unit
function findRejectedBidsForAdUnit(auction, code) {
  const rejectedBidsForAdUnit = [];

  if (!auction?.bidsRejected) return rejectedBidsForAdUnit;
  
  if (Array.isArray(auction.bidsRejected)) {
    rejectedBidsForAdUnit.push(...auction.bidsRejected.filter(bid => bid.adUnitCode === code));
  } else if (typeof auction.bidsRejected === 'object') {
    Object.keys(auction.bidsRejected).forEach(bidder => {
      const bidderRejectedBids = auction.bidsRejected[bidder];
      if (Array.isArray(bidderRejectedBids)) {
        rejectedBidsForAdUnit.push(...bidderRejectedBids.filter(bid => bid.adUnitCode === code));
      }
    });
  }
  
  return rejectedBidsForAdUnit;
}

// Find a rejected bid due to price floor
function findRejectedFloorBid(rejectedBids) {
  return rejectedBids.find(bid => {
    const errorMessage = bid.statusMessage || bid.status || '';
    return errorMessage.includes('price floor') || 
           (bid.floorData && bid.floorData.floorValue && bid.cpm < bid.floorData.floorValue);
  });
}

// Find the winning or highest bid for an ad unit
function findWinningBid(adUnitCode) {
  try {
    const pbjs = getGlobal();
    if (pbjs && typeof pbjs.getHighestCpmBids === 'function') {
      const highestCpmBids = pbjs.getHighestCpmBids(adUnitCode);
      if (highestCpmBids && highestCpmBids.length > 0) {
        const highestCpmBid = highestCpmBids[0];
        logInfo(CONSTANTS.LOG_PRE_FIX, `Found highest CPM bid using pbjs.getHighestCpmBids() for ad unit: ${adUnitCode}, CPM: ${highestCpmBid.cpm}`);
        return highestCpmBid;
      } else {
        logInfo(CONSTANTS.LOG_PRE_FIX, `No highest CPM bids found for ad unit: ${adUnitCode}`);
      }
    }
  } catch (error) {
    logError(CONSTANTS.LOG_PRE_FIX, `Error finding highest CPM bid: ${error}`);
  }
  
  return null;
}

// Find a bid with floor data
function findBidWithFloor(bids) {
  return bids.find(bid => bid.floorData?.floorValue);
}

// Find floor value from bidder requests
function findFloorValueFromBidderRequests(auction, code) {
  if (!auction?.bidderRequests || auction.bidderRequests.length === 0) {
    return 0;
  }
  
  // Find all bids in bidder requests for this ad unit
  const bidsFromRequests = auction.bidderRequests
    .flatMap(request => request.bids || [])
    .filter(bid => bid.adUnitCode === code);
  
  // Look for floor data in any of these bids
  const bidWithFloor = bidsFromRequests.find(bid => bid.getFloor());
  if (bidWithFloor?.getFloor()?.floor) {
    const floorValue = bidWithFloor.getFloor().floor;
    logInfo(CONSTANTS.LOG_PRE_FIX, `Found floor value ${floorValue} from bidder request for ad unit: ${code}`);
    return floorValue;
  }
  
  logInfo(CONSTANTS.LOG_PRE_FIX, `No floor data found in bidder requests for ad unit: ${code}`);
  return 0;
}

// Determine bid status and calculate appropriate values
function determineBidStatusAndValues(winningBid, rejectedFloorBid, bidsForAdUnit, auction, code) {
  let bidStatus, baseValue, multiplier;
  
  // Helper function to set bid status, base value, and multiplier
  function setBidStatusAndValues(status, baseValueSource, multiplierKey, logMessage) {
    bidStatus = status;
    baseValue = baseValueSource;
    multiplier = _multipliers ? _multipliers[multiplierKey] : CONSTANTS.MULTIPLIERS[multiplierKey];
    logInfo(CONSTANTS.LOG_PRE_FIX, logMessage);
  }
  
  if (winningBid) {
    // Winning bid case
    setBidStatusAndValues(
      CONSTANTS.BID_STATUS.WON,
      winningBid.cpm,
      'WIN',
      `Bid won for ad unit: ${code}, CPM: ${winningBid.cpm}, Multiplier: ${_multipliers ? _multipliers.WIN : CONSTANTS.MULTIPLIERS.WIN}`
    );
  } else if (rejectedFloorBid) {
    // Bid rejected due to price floor case
    const floorValue = rejectedFloorBid.floorData?.floorValue || 0;
    setBidStatusAndValues(
      CONSTANTS.BID_STATUS.FLOORED,
      floorValue,
      'FLOORED',
      `Bid rejected due to price floor for ad unit: ${code}, Floor value: ${floorValue}, Bid CPM: ${rejectedFloorBid.cpm}, Multiplier: ${_multipliers ? _multipliers.FLOORED : CONSTANTS.MULTIPLIERS.FLOORED}`
    );
  } else {
    // Find any bid with floor data for this ad unit
    const bidWithFloor = findBidWithFloor(bidsForAdUnit);
    
    if (bidWithFloor?.floorData?.floorValue) {
      // Floor bid case
      const floorValue = bidWithFloor.floorData.floorValue || 0;
      setBidStatusAndValues(
        CONSTANTS.BID_STATUS.FLOORED,
        floorValue,
        'FLOORED',
        `Floored bid for ad unit: ${code}, Floor value: ${floorValue}, Multiplier: ${_multipliers ? _multipliers.FLOORED : CONSTANTS.MULTIPLIERS.FLOORED}`
      );
    } else {
      // No bid case - try to get floor value from bidder requests
      const floorValue = findFloorValueFromBidderRequests(auction, code);
      
      setBidStatusAndValues(
        CONSTANTS.BID_STATUS.NOBID,
        floorValue,
        'NOBID',
        `No bids for ad unit: ${code}, Floor value: ${floorValue}, Multiplier: ${_multipliers ? _multipliers.NOBID : CONSTANTS.MULTIPLIERS.NOBID}`
      );
    }
  }
  
  return { bidStatus, baseValue, multiplier };
}

// Set targeting keys for an ad unit
function setTargetingForAdUnit(hasRtdFloorAppliedBid, acc, code, bidStatus, baseValue, multiplier) {
  const floorValue = baseValue * multiplier;
  
  // Initialize acc[code] if it doesn't exist
  if (!acc[code]) {
    acc[code] = {};
  }
  
  // Only set pm_ym_flrs key to match test expectations
  acc[code][CONSTANTS.TARGETING_KEYS.PM_YM_FLRS] = hasRtdFloorAppliedBid ? 1 : 0;
  acc[code][CONSTANTS.TARGETING_KEYS.PM_YM_FLRV] = floorValue;
  acc[code][CONSTANTS.TARGETING_KEYS.PM_YM_BID_S] = bidStatus;
  logInfo(CONSTANTS.LOG_PRE_FIX, `Setting targeting for ad unit: ${code}, Status: ${bidStatus}, Base value: ${baseValue}, Multiplier: ${multiplier}, Final floor: ${floorValue}`);
  
  return floorValue;
}

export const getTargetingData = (adUnitCodes, config, userConsent, auction) => {
  // Access the profile configs stored globally
  const profileConfigs = getProfileConfigs();

  // Return empty object if profileConfigs is undefined or adServerTargeting is explicitly set to false
  if (!profileConfigs || profileConfigs?.plugins?.dynamicFloors?.adServerTargeting === false) {
    logInfo(`${CONSTANTS.LOG_PRE_FIX} adServerTargeting is disabled or profileConfigs is undefined`);
    return {};
  }

  const isRtdFloorApplied = bid =>
    bid.floorData?.floorProvider === "PM" &&
    !bid.floorData.skipped

  const hasRtdFloorAppliedBid = auction?.adUnits?.some(adUnit =>
    adUnit.bids?.some(isRtdFloorApplied)
  ) || auction?.bidsReceived?.some(isRtdFloorApplied);

  // Only log when RTD floor is applied
  if (hasRtdFloorAppliedBid) {
    logInfo(CONSTANTS.LOG_PRE_FIX, 'Setting targeting via getTargetingData');
  }

  // Process each ad unit code
  const targeting = adUnitCodes.reduce((acc, code) => {
    // Initialize acc[code] if it doesn't exist
    if (!acc[code]) {
      acc[code] = {};
    }
    
    // For RTD floor applied cases, set all targeting keys
    if (hasRtdFloorAppliedBid) {
      // Find bids and determine status
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
      acc[code][CONSTANTS.TARGETING_KEYS.PM_YM_FLRS] = 1;
      acc[code][CONSTANTS.TARGETING_KEYS.PM_YM_FLRV] = baseValue * multiplier;
      acc[code][CONSTANTS.TARGETING_KEYS.PM_YM_BID_S] = bidStatus;
    } else {
      // For non-RTD floor applied cases, only set pm_ym_flrs to 0
      acc[code][CONSTANTS.TARGETING_KEYS.PM_YM_FLRS] = 0;
    }
    
    return acc;
  }, {});

  return targeting;
};

/** @type {RtdSubmodule} */
// Export internal functions for testing
export {
  setTargetingForAdUnit,
  findWinningBid,
  findRejectedFloorBid,
  findBidsForAdUnit,
  findRejectedBidsForAdUnit,
  determineBidStatusAndValues,
  findBidWithFloor,
  findFloorValueFromBidderRequests
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
