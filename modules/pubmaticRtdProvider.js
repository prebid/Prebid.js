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

const CONSTANTS = Object.freeze({
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
    WINBID: 1.0,
    FLOORBID: 0.8,
    NOBIDS: 1.6
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
          WINBID: data.multiplier.WINBID || CONSTANTS.MULTIPLIERS.WINBID,
          FLOORBID: data.multiplier.FLOORBID || CONSTANTS.MULTIPLIERS.FLOORBID,
          NOBIDS: data.multiplier.NOBIDS || CONSTANTS.MULTIPLIERS.NOBIDS
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
export const getTargetingData = (adUnitCodes, config, userConsent, auction) => {
  const isRtdFloorApplied = bid =>
    bid.floorData?.modelVersion?.includes("RTD model") && !bid.floorData.skipped;

  const hasRtdFloorAppliedBid = auction?.adUnits?.some(adUnit =>
    adUnit.bids?.some(isRtdFloorApplied)
  ) || auction?.bidsReceived?.some(isRtdFloorApplied);

  const targeting = adUnitCodes.reduce((acc, code) => {
    // Initialize with pm_ym if RTD floor was applied
    if (hasRtdFloorAppliedBid) {
      acc[code] = { 'pm_ym': 1 };
    } else {
      acc[code] = {};
    }
    
    // Find all bids for this ad unit by filtering bidsReceived
    const bidsForAdUnit = auction?.bidsReceived?.filter(bid => bid.adUnitCode === code) || [];
    
    // Check for rejected bids due to price floor
    // First look in auction.bidsRejected if available
    const rejectedBidsForAdUnit = [];
    if (auction?.bidsRejected) {
      // Different versions of Prebid might structure bidsRejected differently
      // Try to handle multiple possible structures
      if (Array.isArray(auction.bidsRejected)) {
        // If bidsRejected is an array, filter by adUnitCode
        rejectedBidsForAdUnit.push(...auction.bidsRejected.filter(bid => bid.adUnitCode === code));
      } else if (typeof auction.bidsRejected === 'object') {
        // If bidsRejected is an object with bidder keys
        Object.keys(auction.bidsRejected).forEach(bidder => {
          const bidderRejectedBids = auction.bidsRejected[bidder];
          if (Array.isArray(bidderRejectedBids)) {
            rejectedBidsForAdUnit.push(...bidderRejectedBids.filter(bid => bid.adUnitCode === code));
          }
        });
      }
    }
    
    // Look for rejected floor bids
    const rejectedFloorBid = rejectedBidsForAdUnit.find(bid => {
      // Check if bid was rejected due to price floor
      const errorMessage = bid.statusMessage || bid.status || '';
      return errorMessage.includes('price floor') || 
             (bid.floorData && bid.floorData.floorValue && bid.cpm < bid.floorData.floorValue);
    });
    
    // Find the winning or highest bid for this ad unit
    let winningBid;
    
    // First check if we can find a bid with 'targetingSet' status in the current auction
    // This is the most reliable indicator of a winning bid in the current auction context
    const targetingSetBid = bidsForAdUnit.find(bid => bid.status === 'targetingSet');
    
    if (targetingSetBid) {
      winningBid = targetingSetBid;
      logInfo(CONSTANTS.LOG_PRE_FIX, `Found winning bid with status 'targetingSet' for ad unit: ${code}`);
    } else {
      // If no targetingSet bid is found, try to get the highest bid from the current auction
      // Sort bids by cpm in descending order and take the highest one
      const highestBid = bidsForAdUnit.length > 0 ? 
        [...bidsForAdUnit].sort((a, b) => b.cpm - a.cpm)[0] : null;
      
      if (highestBid) {
        winningBid = highestBid;
        logInfo(CONSTANTS.LOG_PRE_FIX, `Using highest bid (cpm: ${highestBid.cpm}) for ad unit: ${code}`);
      } else {
        // As a last resort, try getAllWinningBids() but be aware it might be empty
        try {
          const pbjs = getGlobal();
          if (pbjs && typeof pbjs.getAllWinningBids === 'function') {
            const globalWinningBid = pbjs.getAllWinningBids().find(bid => bid.adUnitCode === code);
            if (globalWinningBid) {
              winningBid = globalWinningBid;
              logInfo(CONSTANTS.LOG_PRE_FIX, `Found winning bid using pbjs.getAllWinningBids() for ad unit: ${code}`);
            } else {
              logInfo(CONSTANTS.LOG_PRE_FIX, `No winning bids found for ad unit: ${code} in getAllWinningBids()`);
            }
          }
        } catch (error) {
          logError(CONSTANTS.LOG_PRE_FIX, `Error using pbjs.getAllWinningBids(): ${error}`);
        }
      }
    }
    
    let bidStatus;
    let baseValue;
    let multiplier;
    
    // Determine bid status and apply appropriate multiplier
    if (winningBid) {
      // Winning bid case
      bidStatus = CONSTANTS.BID_STATUS.WON;
      baseValue = winningBid.cpm;
      // Use multiplier from floors.json if available, otherwise use default
      multiplier = _multipliers ? _multipliers.WINBID : CONSTANTS.MULTIPLIERS.WINBID;
      logInfo(CONSTANTS.LOG_PRE_FIX, `Bid won for ad unit: ${code}, CPM: ${baseValue}, Multiplier: ${multiplier}`);
    } else if (rejectedFloorBid) {
      // Bid rejected due to price floor case
      bidStatus = CONSTANTS.BID_STATUS.FLOORED;
      // Use the floor value from the rejected bid
      baseValue = rejectedFloorBid.floorData?.floorValue || 0;
      // Use multiplier from floors.json if available, otherwise use default
      multiplier = _multipliers ? _multipliers.FLOORBID : CONSTANTS.MULTIPLIERS.FLOORBID;
      logInfo(CONSTANTS.LOG_PRE_FIX, `Bid rejected due to price floor for ad unit: ${code}, Floor value: ${baseValue}, Bid CPM: ${rejectedFloorBid.cpm}, Multiplier: ${multiplier}`);
    } else {
      // Find any bid with floor data for this ad unit
      const bidWithFloor = bidsForAdUnit.find(bid => bid.floorData?.floorValue);
      
      if (bidWithFloor?.floorData?.floorValue) {
        // Floor bid case
        bidStatus = CONSTANTS.BID_STATUS.FLOORED;
        baseValue = bidWithFloor.floorData.floorValue ||;
        // Use multiplier from floors.json if available, otherwise use default
        multiplier = _multipliers ? _multipliers.FLOORBID : CONSTANTS.MULTIPLIERS.FLOORBID;
        logInfo(CONSTANTS.LOG_PRE_FIX, `Floored bid for ad unit: ${code}, Floor value: ${baseValue}, Multiplier: ${multiplier}`);
      } else {
        // No bid case
        bidStatus = CONSTANTS.BID_STATUS.NOBID;
        // Use a default value of 0 for no bids, or could be configured differently
        baseValue = 0;
        // Use multiplier from floors.json if available, otherwise use default
        multiplier = _multipliers ? _multipliers.NOBIDS : CONSTANTS.MULTIPLIERS.NOBIDS;
        logInfo(CONSTANTS.LOG_PRE_FIX, `No bids for ad unit: ${code}, Multiplier: ${multiplier}`);
      }
    }
    
    // Calculate the floor value with multiplier
    const floorValue = baseValue * multiplier;
    
    // Set the targeting keys
    acc[code]['pm_floor'] = floorValue;
    acc[code]['pm_floor_s'] = bidStatus;
    
    logInfo(CONSTANTS.LOG_PRE_FIX, `Setting targeting for ad unit: ${code}, Status: ${bidStatus}, Base value: ${baseValue}, Multiplier: ${multiplier}, Final floor: ${floorValue}`);
    
    return acc;
  }, {});

  if (Object.keys(targeting).length > 0) {
    logInfo(CONSTANTS.LOG_PRE_FIX, 'Setting targeting via getTargetingData', targeting);
    return targeting;
  }

  return {};
};

/** @type {RtdSubmodule} */
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
